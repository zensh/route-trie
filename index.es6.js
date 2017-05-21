// **Github:** https://github.com/zensh/route-trie
//
// **License:** MIT
'use strict'

const wordReg = /^\w+$/
// the valid characters for the path component:
// [A-Za-z0-9!$%&'()*+,-.:;=@_~]
// http://stackoverflow.com/questions/4669692/valid-characters-for-directory-part-of-a-url-for-short-links
// https://tools.ietf.org/html/rfc3986#section-3.3
const suffixReg = /\+[A-Za-z0-9!$%&'*+,-.:;=@_~]*$/
const doubleColonReg = /::[A-Za-z0-9!$%&'*+,-.:;=@_~]*$/
const trimSlashReg = /^\//
const fixMultiSlashReg = /\/{2,}/g

class Trie {
  constructor (options) {
    options = options || {}
    // Ignore case when matching URL path.
    this.ignoreCase = options.ignoreCase !== false

    // If enabled, the trie will detect if the current path can't be matched but
    // a handler for the fixed path exists.
    // matched.fpr will returns either a fixed redirect path or an empty string.
    // For example when "/api/foo" defined and matching "/api//foo",
    // The result matched.fpr is "/api/foo".
    this.fpr = options.fixedPathRedirect !== false

    // If enabled, the trie will detect if the current path can't be matched but
    // a handler for the path with (without) the trailing slash exists.
    // matched.tsr will returns either a redirect path or an empty string.
    // For example if /foo/ is requested but a route only exists for /foo, the
    // client is redirected to /foo.
    // For example when "/api/foo" defined and matching "/api/foo/",
    // The result matched.tsr is "/api/foo".
    this.tsr = options.trailingSlashRedirect !== false
    this.root = new Node(null)
  }

  define (pattern) {
    if (typeof pattern !== 'string') throw new TypeError('Pattern must be string.')
    if (pattern.includes('//')) throw new Error('Multi-slash existhis.')
    let _pattern = pattern.replace(trimSlashReg, '')
    let node = defineNode(this.root, _pattern.split('/'), this.ignoreCase)

    if (node.pattern === '') node.pattern = pattern
    return node
  }

  match (path) {
    // the path should be normalized before match, just as path.normalize do in Node.js
    if (typeof path !== 'string') throw new TypeError('Path must be string.')
    if (!path || path[0] !== '/') {
      throw new Error(`Path is not start with "/": "${path}"`)
    }
    let fixedLen = path.length
    if (this.fpr) {
      path = path.replace(fixMultiSlashReg, '/')
      fixedLen -= path.length
    }

    let start = 1
    let end = path.length
    let matched = new Matched()
    let parent = this.root
    for (let i = 1; i <= end; i++) {
      if (i < end && path[i] !== '/') continue

      let segment = path.slice(start, i)
      let node = matchNode(parent, segment)
      if (this.ignoreCase && node == null) {
        node = matchNode(parent, segment.toLowerCase())
      }
      if (node == null) {
        // TrailingSlashRedirect: /acb/efg/ -> /acb/efg
        if (this.tsr && segment === '' && i === end && parent.endpoint) {
          matched.tsr = path.slice(0, end - 1)
          if (this.fpr && fixedLen > 0) {
            matched.fpr = matched.tsr
            matched.tsr = ''
          }
        }
        return matched
      }

      parent = node
      if (parent.name) {
        if (parent.wildcard) {
          matched.params[parent.name] = path.slice(start, end)
          break
        } else {
          if (parent.suffix !== '') {
            segment = segment.slice(0, segment.length - parent.suffix.length)
          }
          matched.params[parent.name] = segment
        }
      }
      start = i + 1
    }

    if (parent.endpoint) {
      matched.node = parent
      if (this.fpr && fixedLen > 0) {
        matched.fpr = path
        matched.node = null
      }
    } else if (this.tsr && parent.children[''] != null) {
      // TrailingSlashRedirect: /acb/efg -> /acb/efg/
      matched.tsr = path + '/'
      if (this.fpr && fixedLen > 0) {
        matched.fpr = matched.tsr
        matched.tsr = ''
      }
    }
    return matched
  }
}

class Matched {
  constructor () {
    // Either a Node pointer when matched or nil
    this.node = null
    this.params = {}
    // If FixedPathRedirect enabled, it may returns a redirect path,
    // otherwise a empty string.
    this.fpr = ''
    // If TrailingSlashRedirect enabled, it may returns a redirect path,
    // otherwise a empty string.
    this.tsr = ''
  }
}

class Node {
  constructor (parent) {
    this.name = ''
    this.allow = ''
    this.pattern = ''
    this.segment = ''
    this.suffix = ''
    this.regex = null
    this.endpoint = false
    this.wildcard = false
    this.varyChildren = []
    this.parent = parent
    this.children = Object.create(null)
    this.handlers = Object.create(null)
  }

  handle (method, handler) {
    if (!handler) {
      throw new TypeError('handler not exists')
    }
    if (this.handlers[method]) {
      throw new Error(`"${method}" already defined`)
    }
    this.handlers[method] = handler
    if (this.allow === '') {
      this.allow = method
    } else {
      this.allow += ', ' + method
    }
  }

  getHandler (method) {
    return this.handlers[method] || null
  }

  getAllow () {
    return this.allow
  }

  getSegments () {
    let segments = this.segment
    if (this.parent != null) {
      segments = this.parent.getSegments() + '/' + segments
    }
    return segments
  }
}

function defineNode (parent, segments, ignoreCase) {
  let segment = segments.shift()
  let child = parseNode(parent, segment, ignoreCase)

  if (!segments.length) {
    child.endpoint = true
    return child
  }
  if (child.wildcard) {
    throw new Error(`Can not define pattern after wildcard: "${child.pattern}"`)
  }
  return defineNode(child, segments, ignoreCase)
}

function matchNode (parent, segment) {
  if (parent.children[segment] != null) {
    return parent.children[segment]
  }
  for (let child of parent.varyChildren) {
    let _segment = segment
    if (child.suffix !== '') {
      if (segment === child.suffix || !segment.endsWith(child.suffix)) {
        continue
      }
      _segment = segment.slice(0, segment.length - child.suffix.length)
    }
    if (child.regex != null && !child.regex.test(_segment)) {
      continue
    }
    return child
  }
  return null
}

function parseNode (parent, segment, ignoreCase) {
  let _segment = segment
  if (doubleColonReg.test(segment)) {
    _segment = segment.slice(1)
  }
  if (ignoreCase) {
    _segment = _segment.toLowerCase()
  }

  if (parent.children[_segment] != null) return parent.children[_segment]

  let node = new Node(parent)

  if (segment === '') {
    parent.children[''] = node
  } else if (doubleColonReg.test(segment)) {
    // pattern "/a/::" should match "/a/:"
    // pattern "/a/::bc" should match "/a/:bc"
    // pattern "/a/::/bc" should match "/a/:/bc"
    parent.children[_segment] = node
  } else if (segment[0] === ':') {
    let name = segment.slice(1)

    switch (name[name.length - 1]) {
      case '*':
        name = name.slice(0, name.length - 1)
        node.wildcard = true
        break
      default:
        let i = name.search(suffixReg)
        if (i >= 0) {
          node.suffix = name.slice(i + 1)
          name = name.slice(0, i)
          if (node.suffix === '') {
            throw new Error(`invalid pattern: "${node.getSegments()}"`)
          }
        }

        if (name[name.length - 1] === ')') {
          let i = name.indexOf('(')
          if (i > 0) {
            let regex = name.slice(i + 1, name.length - 1)
            if (regex.length > 0) {
              name = name.slice(0, i)
              node.regex = new RegExp(regex)
            } else {
              throw new Error(`Invalid pattern: "${node.getSegments()}"`)
            }
          }
        }
    }

    // name must be word characters `[0-9A-Za-z_]`
    if (!wordReg.test(name)) {
      throw new Error(`Invalid pattern: "${node.getSegments()}"`)
    }
    node.name = name

    for (let child of parent.varyChildren) {
      if (child.wildcard) {
        if (!node.wildcard) {
          throw new Error(`can't define "${node.getSegments()}" after "${child.getSegments()}"`)
        }
        if (child.name !== node.name) {
          throw new Error(`invalid pattern name "${node.name}", as prev defined "${child.getSegments()}"`)
        }
        return child
      }

      if (child.suffix !== node.suffix) {
        continue
      }

      if (!node.wildcard && ((child.regex == null && node.regex == null) ||
        (child.regex != null && node.regex != null && child.regex.toString() === node.regex.toString()))) {
        if (child.name !== node.name) {
          throw new Error(`invalid pattern name "${node.name}", as prev defined "${child.getSegments()}"`)
        }
        return child
      }
    }

    parent.varyChildren.push(node)
    if (parent.varyChildren.length > 1) {
      parent.varyChildren.sort((a, b) => {
        if (a.suffix !== '' && b.suffix === '') return 0
        if (a.suffix === '' && b.suffix !== '') return 1
        if (a.regex == null && b.regex != null) return 1
        return 0
      })
    }
  } else if (segment[0] === '*' || segment[0] === '(' || segment[0] === ')') {
    throw new Error(`Invalid pattern: "${node.getSegments()}"`)
  } else {
    parent.children[_segment] = node
  }
  return node
}

Trie.NAME = 'Trie'
Trie.VERSION = 'v2.2.1'
Trie.Node = Node
Trie.Matched = Matched

export default Trie
