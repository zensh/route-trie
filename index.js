// **Github:** https://github.com/zensh/route-trie
//
// **License:** MIT

/* global module, define */
;(function (root, factory) {
  'use strict'

  if (typeof module === 'object' && module.exports) module.exports = factory()
  else if (typeof define === 'function' && define.amd) define([], factory)
  else root.Trie = factory()
}(typeof window === 'object' ? window : this, function () {
  'use strict'

  var slugReg = /^[-!.~\w]+$/
  var parameterReg = /^(.*)(\:\w+\b)(.*)$/
  var multiSlashReg = /(\/){2,}/
  var trimSlashReg = /(^\/)|(\/$)/g
  var EmptyBracketReg = /\(\)/g

  function Trie (flags) {
    this.flags = flags ? 'i' : ''
    this.root = new Node('root')
  }

  Trie.prototype.define = function (pattern) {
    if (typeof pattern !== 'string') throw new Error('Pattern is not valid string.')
    if (multiSlashReg.test(pattern)) throw new Error('Multi-slash exist.')
    if (EmptyBracketReg.test(pattern)) throw new Error('Empty bracketR exist.')

    var _pattern = pattern.replace(trimSlashReg, '')
    var node = define(this.root, _pattern.split('/'), this.flags)
    if (node._nodeState.pattern === null) node._nodeState.pattern = pattern

    return node
  }

  Trie.prototype.match = function (path, multiMatch) {
    if (typeof path !== 'string') throw new Error('Path is not valid string.')
    // the path should be normalized before match, just as path.normalize do in Node.js
    path = path.replace(trimSlashReg, '')

    var node = this.root
    var frags = path.split('/')
    var matched = new TrieMatched()

    while (frags.length) {
      node = matchNode(node, frags, matched.params, this.flags)
      if (node) {
        if (multiMatch && node._nodeState.endpoint) matched.nodes.push(node)
        continue
      }
      if (!multiMatch) return null
      break
    }

    if (multiMatch) return matched
    if (!node._nodeState.endpoint) return null
    matched.node = node
    return matched
  }

  function define (parentNode, frags, flags) {
    var frag = frags.shift()
    var child = parseNode(parentNode, frag, flags)
    if (!frags.length) {
      child._nodeState.endpoint = true
      return child
    }
    if (child._nodeState.matchRemaining) throw new Error('Can not define regex pattern after "*" pattern.')
    return define(child, frags, flags)
  }

  function NodeState (frag, matchRemaining) {
    this.name = frag
    this.pattern = null
    this.endpoint = false
    this.matchRemaining = matchRemaining
    this.childNodes = Object.create(null)
    this.regexNames = Object.create(null)
    this.regexChildNodes = []
  }

  function RegexNode (node, prefix, param, regex) {
    this.node = node
    this.prefix = prefix || ''
    this.param = param || ''
    this.regex = regex || null
  }

  function Node (frag, matchRemaining) {
    Object.defineProperty(this, '_nodeState', {
      enumerable: false,
      configurable: false,
      writable: false,
      value: new NodeState(frag, matchRemaining)
    })
  }

  function TrieMatched () {
    this.node = null
    this.nodes = []
    this.params = {}
  }

  function matchNode (node, frags, params, flags) {
    var frag = safeDecodeURIComponent(frags.shift())
    if (frag === false) return null

    var childNodes = node._nodeState.childNodes
    var child = childNodes[flags ? frag.toLowerCase() : frag]
    if (child) return child

    var regexChildNodes = node._nodeState.regexChildNodes

    for (var i = 0, len = regexChildNodes.length; i < len; i++) {
      var _frag = frag
      var regexNode = regexChildNodes[i]

      if (regexNode.prefix) {
        if (_frag.indexOf(regexNode.prefix) !== 0) continue
        _frag = _frag.slice(regexNode.prefix.length)
      }

      if (regexNode.regex && !regexNode.regex.test(_frag)) continue
      if (regexNode.node._nodeState.matchRemaining) {
        while (frags.length) {
          var __frag = safeDecodeURIComponent(frags.shift())
          if (__frag === false) return null
          _frag += '/' + __frag
        }
      }
      if (regexNode.param) params[regexNode.param] = _frag
      child = regexNode.node
      break
    }

    return child
  }

  function parseNode (parentNode, frag, flags) {
    var childNodes = parentNode._nodeState.childNodes

    // simple string node
    if (isValidSlug(frag)) {
      if (!childNodes[frag]) childNodes[frag] = new Node(frag)
      return childNodes[frag]
    }

    var regexChildNodes = parentNode._nodeState.regexChildNodes
    var lastRegexNode = regexChildNodes[regexChildNodes.length - 1]
    if (lastRegexNode && lastRegexNode.node._nodeState.matchRemaining) {
      throw new Error('Can not define more regex pattern while "*" pattern defined.')
    }

    // Find a parameter name for the string
    var prefix = ''
    var parameter = ''
    var regex = frag
    var matchRemaining = false
    var _frag = parameterReg.exec(frag)

    if (_frag) {
      prefix = _frag[1]
      parameter = _frag[2].slice(1)
      regex = _frag[3]
    }

    if (regex === '*' || regex === '(*)') {
      regex = '.*'
      matchRemaining = true
    }
    if (regex) regex = wrapRegex(regex)
    // normalize frag
    frag = prefix + '|' + regex
    var regexNames = parentNode._nodeState.regexNames
    // if regex node exist
    if (regexNames[frag]) return regexChildNodes[regexNames[frag]].node

    var node = new Node(frag, matchRemaining)
    regexNames[frag] = '' + regexChildNodes.length
    regexChildNodes.push(new RegexNode(node, prefix, parameter, regex && new RegExp(regex, flags)))
    return node
  }

  function safeDecodeURIComponent (string) {
    try {
      return decodeURIComponent(string)
    } catch (err) {
      return false
    }
  }

  function isValidSlug (str) {
    return str === '' || slugReg.test(str)
  }

  function wrapRegex (str) {
    return '^' + str.replace(/^\(?/, '(').replace(/\)?$/, ')') + '$'
  }

  Trie.NAME = 'Trie'
  Trie.VERSION = 'v1.1.1'
  return Trie
}))
