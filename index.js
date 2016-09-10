// **Github:** https://github.com/zensh/route-trie
//
// **License:** MIT

/* global module, define */
;(function (root, factory) {
  'use strict'

  if (typeof module === 'object' && module.exports) module.exports = factory()
  else if (typeof define === 'function' && define.amd) define([], factory)
  else root.RouteTrie = factory()
}(typeof window === 'object' ? window : this, function () {
  'use strict'

  var sepReg = /\|/
  var multiSlashReg = /(\/){2,}/
  var maybeRegex = /[?^{}()|[\]\\]/
  var regexReg = /^([^\(\n\r\u2028\u2029]*)(\(.+\))$/
  var parameterReg = /^(.*)(:\w+\b)(.*)$/
  var escapeReg = /[.*+?^${}()|[\]\\]/g
  var trimSlashReg = /(^\/)|(\/$)/g

  function Trie (flags) {
    this.flags = flags ? 'i' : ''
    this.root = new Node(null, 'root')
    this.nodes = {}
  }

  Trie.prototype.define = function (pattern) {
    if (typeof pattern !== 'string') throw new TypeError('Pattern must be string.')
    if (multiSlashReg.test(pattern)) throw new Error('Multi-slash exist.')
    if (!(this.nodes[pattern] instanceof Node)) {
      var _pattern = pattern.replace(trimSlashReg, '')
      var node = define(this.root, _pattern.split('/'), this.flags)

      if (node._nodeState.pattern == null) node._nodeState.pattern = pattern
      this.nodes[pattern] = node
    }
    return this.nodes[pattern]
  }

  // the path should be normalized before match, just as path.normalize do in Node.js
  Trie.prototype.match = function (path, multiMatch) {
    if (typeof path !== 'string') throw new TypeError('Path must be string.')
    path = path.replace(trimSlashReg, '')

    var node = this.root
    var frags = path.split('/')
    var matched = new TrieMatched()

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

  function Node (parentNode, frag, matchRemains) {
    Object.defineProperty(this, '_nodeState', {
      enumerable: false,
      configurable: false,
      writable: false,
      value: new NodeState(parentNode, frag, matchRemains)
    })
  }

  function NodeState (parentNode, frag, matchRemains) {
    this.name = frag
    this.pattern = null
    this.endpoint = false
    this.parentNode = parentNode
    this.matchRemains = !!matchRemains
    this.childNodes = Object.create(null)
    this.regexNames = Object.create(null)
    this.regexNodes = []
  }

  function RegexNode (node, prefix, param, regex) {
    this.node = node
    this.prefix = prefix || ''
    this.param = param || ''
    this.regex = regex || null
  }

  function TrieMatched () {
    this.node = null
    this.nodes = []
    this.params = {}
  }

  function define (parentNode, frags, flags) {
    var frag = frags.shift()
    var child = parseNode(parentNode, frag, flags)

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
    var frag = safeDecodeURIComponent(frags.shift())
    if (frag === false) return null

    var childNodes = node._nodeState.childNodes
    var child = childNodes[flags ? frag.toLowerCase() : frag]
    if (child) return child

    var regexNodes = node._nodeState.regexNodes

    for (var fragCopy, regexNode, i = 0, len = regexNodes.length; i < len; i++) {
      fragCopy = frag
      regexNode = regexNodes[i]

      if (regexNode.prefix) {
        if (fragCopy.indexOf(regexNode.prefix) !== 0) continue
        fragCopy = fragCopy.slice(regexNode.prefix.length)
      }

      if (regexNode.regex && !regexNode.regex.test(fragCopy)) continue
      if (regexNode.node._nodeState.matchRemains) {
        while (frags.length) {
          var remain = safeDecodeURIComponent(frags.shift())
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
    var res = null
    var regex = ''
    var prefix = ''
    var parameter = ''
    var matchRemains = false
    var childNodes = parentNode._nodeState.childNodes
    var regexNames = parentNode._nodeState.regexNames
    var regexNodes = parentNode._nodeState.regexNodes

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
    var regexName = prefix + ':' + regex
    // if regex node exist
    if (regexNames[regexName]) return regexNodes[regexNames[regexName]].node

    if (prefix) checkMatchRegex(frag, prefix, parentNode._nodeState)
    var node = new Node(parentNode, regexName, matchRemains)
    if (regex) regex = new RegExp(regex, flags)
    regexNames[regexName] = '' + regexNodes.length
    regexNodes.push(new RegexNode(node, prefix, parameter, regex))
    return node
  }

  function checkMatchRegex (frag, prefix, parentNodeState) {
    var regexNode = parentNodeState.regexNames[prefix + ':^(.*)$']
    if (regexNode) {
      var pattern = parentNodeState.regexNodes[regexNode].node._nodeState.pattern
      throw new Error('Can not define "' + frag + '" after "' + pattern + '".')
    }
  }

  function wrapSepExp (str) {
    var res = str.split('|')
    for (var i = 0, len = res.length; i < len; i++) {
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
  Trie.VERSION = 'v1.2.7'
  Trie.safeDecodeURIComponent = safeDecodeURIComponent
  return Trie
}))
