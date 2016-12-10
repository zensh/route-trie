// **Github:** https://github.com/zensh/route-trie
//
// **License:** MIT
'use strict'

const wordReg = /^\w+$/
const doubleColonReg = /::\w*$/
const trimSlashReg = /^\//
const multiSlashReg = /\/{2,}/
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
    if (multiSlashReg.test(pattern)) throw new Error('Multi-slash existhis.')
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

    let i = 0
    let start = 1
    let end = path.length
    let res = new Matched()
    let parent = this.root
    let _path = path + '/'
    while (true) {
      if (++i > end) {
        break
      }
      if (_path[i] !== '/') {
        continue
      }
      let frag = _path.slice(start, i)
      let node = matchNode(parent, frag)
      if (this.ignoreCase && node == null) {
        node = matchNode(parent, frag.toLowerCase())
      }
      if (node == null) {
        // TrailingSlashRedirect: /acb/efg/ -> /acb/efg
        if (this.tsr && frag === '' && i === end && parent.endpoint) {
          res.tsr = path.slice(0, end - 1)
          if (this.fpr && fixedLen > 0) {
            res.fpr = res.tsr
            res.tsr = ''
          }
        }
        return res
      }

      parent = node
      if (parent.name) {
        if (parent.wildcard) {
          res.params[parent.name] = path.slice(start, end)
          break
        } else {
          res.params[parent.name] = frag
        }
      }
      start = i + 1
    }

    if (parent.endpoint) {
      res.node = parent
      if (this.fpr && fixedLen > 0) {
        res.fpr = path
        res.node = null
      }
    } else if (this.tsr && parent.children[''] != null) {
      // TrailingSlashRedirect: /acb/efg -> /acb/efg/
      res.tsr = path + '/'
      if (this.fpr && fixedLen > 0) {
        res.fpr = res.tsr
        res.tsr = ''
      }
    }
    return res
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
    this.regex = null
    this.endpoint = false
    this.wildcard = false
    this.varyChild = null
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
}

function defineNode (parent, frags, ignoreCase) {
  let frag = frags.shift()
  let child = parseNode(parent, frag, ignoreCase)

  if (!frags.length) {
    child.endpoint = true
    return child
  }
  if (child.wildcard) {
    throw new Error(`Can not define pattern after wildcard: "${child.pattern}"`)
  }
  return defineNode(child, frags, ignoreCase)
}

function matchNode (parent, frag) {
  let child = parent.children[frag]
  if (child == null) {
    child = parent.varyChild
    if (child != null && child.regex != null && !child.regex.test(frag)) {
      child = null
    }
  }
  return child
}

function parseNode (parent, frag, ignoreCase) {
  let _frag = frag
  if (doubleColonReg.test(frag)) {
    _frag = frag.slice(1)
  }
  if (ignoreCase) {
    _frag = _frag.toLowerCase()
  }

  if (parent.children[_frag] != null) return parent.children[_frag]

  let node = new Node(parent)

  if (frag === '') {
    parent.children[''] = node
  } else if (doubleColonReg.test(frag)) {
    // pattern "/a/::" should match "/a/:"
    // pattern "/a/::bc" should match "/a/:bc"
    // pattern "/a/::/bc" should match "/a/:/bc"
    parent.children[_frag] = node
  } else if (frag[0] === ':') {
    let regex
    let name = frag.slice(1)
    let trailing = name[name.length - 1]
    if (trailing === ')') {
      let index = name.indexOf('(')
      if (index > 0) {
        regex = name.slice(index + 1, name.length - 1)
        if (regex.length > 0) {
          name = name.slice(0, index)
          node.regex = new RegExp(regex)
        } else {
          throw new Error(`Invalid pattern: "${frag}"`)
        }
      }
    } else if (trailing === '*') {
      name = name.slice(0, name.length - 1)
      node.wildcard = true
    }
    // name must be word characters `[0-9A-Za-z_]`
    if (!wordReg.test(name)) {
      throw new Error(`Invalid pattern: "${frag}"`)
    }
    node.name = name
    let child = parent.varyChild
    if (child != null) {
      if (child.name !== name || child.wildcard !== node.wildcard) {
        throw new Error(`Invalid pattern: "${frag}"`)
      }
      if (child.regex != null && child.regex.toString() !== node.regex.toString()) {
        throw new Error(`Invalid pattern: "${frag}"`)
      }
      return child
    }

    parent.varyChild = node
  } else if (frag[0] === '*' || frag[0] === '(' || frag[0] === ')') {
    throw new Error(`Invalid pattern: "${frag}"`)
  } else {
    parent.children[_frag] = node
  }
  return node
}

Trie.NAME = 'Trie'
Trie.VERSION = 'v2.0.1'
Trie.Node = Node
Trie.Matched = Matched
module.exports = Trie.Trie = Trie
