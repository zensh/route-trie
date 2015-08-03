'use strict'
/*global module, process*/
var Trie = require('route-trie')

var trie = new Trie()
var node = trie.define('/:type')
console.log(node)
