// **Github:** https://github.com/zensh/route-trie
//
// **License:** MIT

/* global module, define */
;(function (root, factory) {
  'use strict';

  if (typeof module === 'object' && module.exports) module.exports = factory();
  else if (typeof define === 'function' && define.amd) define([], factory);
  else root.Trie = factory();

}(typeof window === 'object' ? window : this, function () {
  'use strict';

  var slugReg = /^[\w\.-]+$/;
  var parameterReg = /^\:\w+\b/;
  var multiSlashReg = /(\/){2,}/g;
  var trimSlashReg = /(^\/)|(\/$)/g;
  var EmptyBracketReg = /\(\)/g;

  function Trie(flags) {
    this.flags = flags ? 'i' : '';
    this.root = new Node('root');
  }

  Trie.prototype.define = function (pattern) {
    if (typeof pattern !== 'string') throw new TypeError('Only strings can be defined.');
    pattern = pattern
      .replace(multiSlashReg, '\/')
      .replace(trimSlashReg, '')
      .replace(EmptyBracketReg, '');

    return define(this.root, pattern.split('/'), this.flags);
  };

  Trie.prototype.match = function (path) {
    // the path should be normalized before match, just as path.normalize do in Node.js
    path = path
      .replace(multiSlashReg, '\/')
      .replace(trimSlashReg, '');
    var frags = path.split('/');
    var result = {params: {}, node: null};
    var node = this.root;
    var child = null;
    var frag = '';

    while (frags.length) {
      frag = safeDecodeURIComponent(frags.shift());
      if (frag === false) return null;
      child = node._nodeState.childNodes[this.flags ? frag.toLowerCase() : frag];

      if (!child) {
        for (var i = 0, len = node._nodeState.regexChildNodes.length; i < len; i++) {
          var regex = node._nodeState.regexChildNodes[i];
          if (regex[2] && !regex[2].test(frag)) continue;
          if (regex[1]) result.params[regex[1]] = frag;
          child = regex[0];
          break;
        }
      }
      if (!child) return null;
      node = child;
    }
    if (!node._nodeState.endpoint) return null;

    result.node = node;
    return result;
  };

  function define(parentNode, frags, flags) {
    var frag = frags.shift();
    var child = parseNode(parentNode, frag, flags);
    if (!frags.length) {
      child._nodeState.endpoint = true;
      return child;
    }
    return define(child, frags, flags);
  }

  function NodeState(frag) {
    this.name = frag;
    this.endpoint = false;
    this.childNodes = Object.create(null);
    this.regexNames = Object.create(null);
    this.regexChildNodes = [];
  }

  function Node(frag) {
    Object.defineProperty(this, '_nodeState', {
      enumerable: false,
      configurable: false,
      writable: false,
      value: new NodeState(frag)
    });
  }

  function parseNode(parentNode, frag, flags) {
    var node = null;
    var parameter = '';
    var childNodes = parentNode._nodeState.childNodes;
    var regexNames = parentNode._nodeState.regexNames;
    var regexChildNodes = parentNode._nodeState.regexChildNodes;

    // Is a simple string
    if (isValidSlug(frag)) {
      node = childNodes[frag] || new Node(frag);
      childNodes[frag] = node;
    } else {
      // Find a parameter name for the string
      frag = frag.replace(parameterReg, function (str) {
        parameter = str.slice(1);
        return '';
      });

      if (frag) frag = wrapRegex(frag);

      if (regexNames[frag] >= 0) node = regexChildNodes[regexNames[frag]][0];
      else {
        node = new Node(frag);
        regexChildNodes.push([node, parameter, frag && new RegExp(frag, flags)]);
        regexNames[frag] = regexChildNodes.length - 1;
      }
    }

    return node;
  }

  function safeDecodeURIComponent(string) {
    try {
      return decodeURIComponent(string);
    } catch (err) {
      return false;
    }
  }

  function isValidSlug(str) {
    return str === '' || slugReg.test(str);
  }

  function wrapRegex(str) {
    return (str[0] === '(' ? '^' : '^(') + str + (str[str.length - 1] === ')' ? '$' : ')$');
  }

  Trie.NAME = 'Trie';
  Trie.VERSION = 'v0.1.2';
  return Trie;
}));
