// **Github:** https://github.com/zensh/route-trie
//
// **License:** MIT

const sepReg = /\|/
const multiSlashReg = /(\/){2,}/
const maybeRegex = /[?^{}()|[\]\\]/
const regexReg = /^([^\(\n\r\u2028\u2029]*)(\(.+\))$/
const parameterReg = /^(.*)(\:\w+\b)(.*)$/
const escapeReg = /[.*+?^${}()|[\]\\]/g
const trimSlashReg = /(^\/)|(\/$)/g

class Node {
  constructor (parentNode, frag, matchRemains) {
    Object.defineProperty(this, '_nodeState', {
      enumerable: false,
      configurable: false,
      writable: false,
      value: new NodeState(parentNode, frag, matchRemains)
    })
  }
}

class NodeState {
  constructor (parentNode, frag, matchRemains) {
    this.name = frag
    this.pattern = null
    this.endpoint = false
    this.parentNode = parentNode
    this.matchRemains = !!matchRemains
    this.childNodes = Object.create(null)
    this.regexNames = Object.create(null)
    this.regexNodes = []
  }
}

class RegexNode {
  constructor (node, prefix, param, regex) {
    this.node = node
    this.prefix = prefix || ''
    this.param = param || ''
    this.regex = regex || null
  }
}

class TrieMatched {
  constructor () {
    this.node = null
    this.nodes = []
    this.params = {}
  }
}

class Trie {
  constructor (flags) {
    this.flags = flags ? 'i' : ''
    this.root = new Node(null, 'root')
  }

  define (pattern) {
    if (typeof pattern !== 'string') throw new TypeError('Pattern must be string.')
    if (multiSlashReg.test(pattern)) throw new Error('Multi-slash exist.')

    let _pattern = pattern.replace(trimSlashReg, '')
    let node = define(this.root, _pattern.split('/'), this.flags)

    if (node._nodeState.pattern == null) node._nodeState.pattern = pattern
    return node
  }

  match (path, multiMatch) {
    // the path should be normalized before match, just as path.normalize do in Node.js
    if (typeof path !== 'string') throw new TypeError('Path must be string.')
    path = path.replace(trimSlashReg, '')

    let node = this.root
    let frags = path.split('/')
    let matched = new TrieMatched()

    while (frags.length) {
      node = matchNode(node, frags, matched.params, this.flags)
      // matched
      if (node) {
        if (multiMatch && node._nodeState.endpoint) matched.nodes.push(node)
        continue
      }
      // not match
      return multiMatch ? matched : null
    }

    matched.node = node
    if (!multiMatch && !node._nodeState.endpoint) return null
    return matched
  }
}

function define (parentNode, frags, flags) {
  let frag = frags.shift()
  let child = parseNode(parentNode, frag, flags)

  if (!frags.length) {
    child._nodeState.endpoint = true
    return child
  }
  if (child._nodeState.matchRemains) {
    throw new Error('Can not define regex pattern after "(*)" pattern.')
  }
  return define(child, frags, flags)
}

function matchNode (node, frags, params, flags) {
  let frag = safeDecodeURIComponent(frags.shift())
  if (frag === false) return null

  let childNodes = node._nodeState.childNodes
  let child = childNodes[flags ? frag.toLowerCase() : frag]
  if (child) return child

  let regexNodes = node._nodeState.regexNodes

  for (let fragCopy, regexNode, i = 0, len = regexNodes.length; i < len; i++) {
    fragCopy = frag
    regexNode = regexNodes[i]

    if (regexNode.prefix) {
      if (fragCopy.indexOf(regexNode.prefix) !== 0) continue
      fragCopy = fragCopy.slice(regexNode.prefix.length)
    }

    if (regexNode.regex && !regexNode.regex.test(fragCopy)) continue
    if (regexNode.node._nodeState.matchRemains) {
      while (frags.length) {
        let remain = safeDecodeURIComponent(frags.shift())
        if (remain === false) return null
        fragCopy += '/' + remain
      }
    }
    if (regexNode.param) params[regexNode.param] = fragCopy
    child = regexNode.node
    break
  }

  return child
}

function parseNode (parentNode, frag, flags) {
  let res = null
  let regex = ''
  let prefix = ''
  let parameter = ''
  let matchRemains = false
  let childNodes = parentNode._nodeState.childNodes
  let regexNames = parentNode._nodeState.regexNames
  let regexNodes = parentNode._nodeState.regexNodes

  if (childNodes[frag]) return childNodes[frag]
  checkMatchRegex(frag, '', parentNode._nodeState)

  if ((res = parameterReg.exec(frag))) {
    // case: `prefix:name(regex)`
    prefix = res[1]
    parameter = res[2].slice(1)
    regex = res[3]
    if (regex && !regexReg.test(regex)) {
      throw new Error('Can not parse "' + regex + '" as regex pattern')
    }
  } else if ((res = regexReg.exec(frag))) {
    // case: `prefix(regex)`
    prefix = res[1]
    regex = res[2]
  } else if (sepReg.test(frag)) {
    // case: `a|b|c`
    regex = wrapSepExp(frag)
  } else if (maybeRegex.test(frag)) {
    throw new Error('Can not parse "' + frag + '"')
  } else {
    // case: other simple string node
    childNodes[frag] = new Node(parentNode, frag)
    return childNodes[frag]
  }

  if (regex === '(*)') {
    regex = '(.*)'
    matchRemains = true
  }

  if (regex) regex = '^' + regex + '$'
  // normalize frag as regex node name
  let regexName = prefix + ':' + regex
  // if regex node exist
  if (regexNames[regexName]) return regexNodes[regexNames[regexName]].node

  if (prefix) checkMatchRegex(frag, prefix, parentNode._nodeState)
  let node = new Node(parentNode, regexName, matchRemains)
  if (regex) regex = new RegExp(regex, flags)
  regexNames[regexName] = '' + regexNodes.length
  regexNodes.push(new RegexNode(node, prefix, parameter, regex))
  return node
}

function checkMatchRegex (frag, prefix, parentNodeState) {
  let regexNode = parentNodeState.regexNames[prefix + ':^(.*)$']
  if (regexNode) {
    let pattern = parentNodeState.regexNodes[regexNode].node._nodeState.pattern
    throw new Error('Can not define "' + frag + '" after "' + pattern + '".')
  }
}

function wrapSepExp (str) {
  let res = str.split('|')
  for (let i = 0, len = res.length; i < len; i++) {
    if (!res[i]) throw new Error('Can not parse "' + str + '" as separated pattern')
    res[i] = res[i].replace(escapeReg, '\\$&')
  }
  return '(' + res.join('|') + ')'
}

function safeDecodeURIComponent (string) {
  try {
    return decodeURIComponent(string)
  } catch (err) {
    return false
  }
}

Trie.NAME = 'Trie'
Trie.VERSION = 'v1.2.5'
Trie.safeDecodeURIComponent = safeDecodeURIComponent
export default Trie
