'use strict'
/*global describe, it*/

var assert = require('assert')
var Trie = require('../index.js')

describe('route-trie', function () {
  describe('trie.define', function () {
    it('root pattern', function () {
      var trie = new Trie()

      var node = trie.define('/')
      assert.strictEqual(node, trie.define(''))
      assert.strictEqual(node._nodeState.pattern, '/')

      assert.strictEqual(node._nodeState.parentNode, trie.root)
      assert.strictEqual(trie.root._nodeState.parentNode, null)
    })

    it('simple pattern', function () {
      var trie = new Trie()

      var node = trie.define('/a/b')
      assert.strictEqual(node, trie.define('a/b'))
      assert.strictEqual(node, trie.define('a/b/'))
      assert.strictEqual(node, trie.define('/a/b/'))
      assert.strictEqual(node._nodeState.pattern, '/a/b')

      var parent = trie.define('/a')
      assert.strictEqual(node._nodeState.parentNode, parent)

      var child = trie.define('/a/b/c')
      assert.strictEqual(child._nodeState.parentNode, node)
    })

    it('separated pattern', function () {
      var trie = new Trie()

      var node = trie.define('/a/b|c|d')
      assert.strictEqual(node._nodeState.pattern, '/a/b|c|d')

      var parent = trie.define('/a')
      assert.strictEqual(node._nodeState.parentNode, parent)

      var child = trie.define('/a/b|c|d/e')
      assert.strictEqual(child._nodeState.parentNode, node)

      var child2 = trie.define('/a/x|y|x/e')
      assert.notStrictEqual(child2, child)
      assert.notStrictEqual(child2._nodeState.parentNode, node)
      assert.strictEqual(child2._nodeState.parentNode._nodeState.parentNode, parent)
    })

    it('regex pattern', function () {
      var trie = new Trie()

      var node = trie.define('/a/([0-9a-fA-F]{24})')
      assert.strictEqual(node._nodeState.pattern, '/a/([0-9a-fA-F]{24})')

      var parent = trie.define('/a')
      assert.strictEqual(node._nodeState.parentNode, parent)

      var child = trie.define('/a/([0-9a-fA-F]{24})/b')
      assert.strictEqual(child._nodeState.parentNode, node)

      node = trie.define('/a/(abc(cat|dog))')
      assert.strictEqual(node._nodeState.parentNode, parent)
    })

    it('regex pattern with prefix', function () {
      var trie = new Trie()

      var node = trie.define('/a/id([0-9a-fA-F]{24})')
      assert.strictEqual(node._nodeState.pattern, '/a/id([0-9a-fA-F]{24})')

      var node2 = trie.define('/a/ix([0-9a-fA-F]{24})')
      assert.strictEqual(node2._nodeState.pattern, '/a/ix([0-9a-fA-F]{24})')
      assert.notStrictEqual(node, node2)
      assert.notStrictEqual(node, trie.define('/a/id'))

      var parent = trie.define('/a')
      assert.strictEqual(node._nodeState.parentNode, parent)
      assert.strictEqual(node2._nodeState.parentNode, parent)

      var child = trie.define('/a/id([0-9a-fA-F]{24})/b')
      assert.strictEqual(child._nodeState.parentNode, node)
    })

    it('regex pattern with special prefix', function () {
      var trie = new Trie()

      var node = trie.define('/a')
      assert.strictEqual(trie.define('/a/$id(.*)')._nodeState.parentNode, node)
      assert.strictEqual(trie.define('/a/正(.*)')._nodeState.parentNode, node)
    })

    it('regex pattern vs separated pattern', function () {
      var trie = new Trie()

      var node = trie.define('/a/b|c')
      var node2 = trie.define('/a/(b|c)')
      assert.strictEqual(node, node2)

      node = trie.define('/a/b|c|.+')
      node2 = trie.define('/a/(b|c|.+)')
      assert.notStrictEqual(node, node2)
    })

    it('named pattern', function () {
      var trie = new Trie()

      var node = trie.define('/a/:b')
      assert.strictEqual(node._nodeState.pattern, '/a/:b')
      assert.strictEqual(node, trie.define('/a/:x'))

      var parent = trie.define('/a')
      assert.strictEqual(node._nodeState.parentNode, parent)

      var child = trie.define('/a/:b/c')
      assert.strictEqual(child._nodeState.parentNode, node)
      assert.strictEqual(child, trie.define('/a/:x/c'))
    })

    it('named pattern with prefix', function () {
      var trie = new Trie()

      var node = trie.define('/a/id:b')
      assert.strictEqual(node._nodeState.pattern, '/a/id:b')
      assert.strictEqual(node, trie.define('/a/id:x'))
      assert.notStrictEqual(node, trie.define('/a/id'))
      assert.notStrictEqual(node, trie.define('/a/ix:b'))

      var parent = trie.define('/a')
      assert.strictEqual(node._nodeState.parentNode, parent)

      var child = trie.define('/a/id:b/c')
      assert.strictEqual(child._nodeState.parentNode, node)
      assert.strictEqual(child, trie.define('/a/id:x/c'))
    })

    it('named pattern with regex', function () {
      var trie = new Trie()

      var node = trie.define('/a/:id([0-9a-fA-F]{24})')
      assert.strictEqual(node._nodeState.pattern, '/a/:id([0-9a-fA-F]{24})')
      assert.strictEqual(node, trie.define('/a/:ix([0-9a-fA-F]{24})'))

      var parent = trie.define('/a')
      assert.strictEqual(node._nodeState.parentNode, parent)

      var child = trie.define('/a/:id([0-9a-fA-F]{24})/c')
      assert.strictEqual(child._nodeState.parentNode, node)
      assert.strictEqual(child, trie.define('/a/:ix([0-9a-fA-F]{24})/c'))
    })

    it('named pattern with prefix and regex', function () {
      var trie = new Trie()

      var node = trie.define('/a/pre:id([0-9a-fA-F]{24})')
      assert.strictEqual(node._nodeState.pattern, '/a/pre:id([0-9a-fA-F]{24})')
      assert.strictEqual(node, trie.define('/a/pre:ix([0-9a-fA-F]{24})'))
      assert.notStrictEqual(node, trie.define('/a/prx:id([0-9a-fA-F]{24})'))

      var parent = trie.define('/a')
      assert.strictEqual(node._nodeState.parentNode, parent)

      var child = trie.define('/a/pre:id([0-9a-fA-F]{24})/c')
      assert.strictEqual(child._nodeState.parentNode, node)
      assert.strictEqual(child, trie.define('/a/pre:ix([0-9a-fA-F]{24})/c'))
    })

    it('regex pattern with special prefix and regex', function () {
      var trie = new Trie()

      var node = trie.define('/a')
      assert.strictEqual(trie.define('/a/::id')._nodeState.parentNode, node)
      assert.strictEqual(trie.define('/a/正:id')._nodeState.parentNode, node)
      assert.strictEqual(trie.define('/a/:-:id')._nodeState.parentNode, node)
      assert.strictEqual(trie.define('/a/$:id')._nodeState.parentNode, node)
      assert.strictEqual(trie.define('/a/pre.::id(.*)')._nodeState.parentNode, node)
    })

    it('pattern match remains', function () {
      var trie = new Trie()

      var node = trie.define('(*)')
      assert.strictEqual(node._nodeState.parentNode, trie.root)

      assert.throws(function () {
        trie.define('')
      })

      assert.throws(function () {
        trie.define('/a')
      })

      trie = new Trie()
      node = trie.define('/a/(*)')
      assert.strictEqual(node._nodeState.parentNode, trie.define('/a'))
      assert.strictEqual(trie.define('/a')._nodeState.parentNode, trie.root)

      assert.throws(function () {
        trie.define('/a/b')
      })

      assert.throws(function () {
        trie.define('/a/b/c')
      })
    })

    it('pattern match remains 2', function () {
      var trie = new Trie()

      var node = trie.define('/a/b(*)')
      assert.strictEqual(node._nodeState.parentNode, trie.define('/a'))
      trie.define('/a/bc')
      trie.define('/a/b/c')
      trie.define('/a/c(*)')
      trie.define('/a/d(*)')
      assert.throws(function () {
        trie.define('/a/d(*)/e')
      })

      trie.define('/a/(*)')

      assert.throws(function () {
        trie.define('/a/e(*)')
      })
    })

    it('throw error when not a string', function () {
      var trie = new Trie()

      assert.throws(function () {
        trie.define(1)
      }, TypeError, 'Pattern must be string.')

      assert.throws(function () {
        trie.define()
      }, TypeError, 'Pattern must be string.')
    })

    it('throw error when multi-slash exist', function () {
      var trie = new Trie()

      // https://github.com/zensh/route-trie/pull/6
      try {
        trie.define('///')
      } catch (e) {}

      assert.throws(function () {
        trie.define('///')
      }, Error, 'Multi-slash exist.')

      assert.throws(function () {
        trie.define('//')
      }, Error, 'Multi-slash exist.')

      assert.throws(function () {
        trie.define('//a/b')
      }, Error, 'Multi-slash exist.')

      assert.throws(function () {
        trie.define('/a//b')
      }, Error, 'Multi-slash exist.')

      assert.throws(function () {
        trie.define('/a/b//')
      }, Error, 'Multi-slash exist.')
    })

    it('throw error when some strange pattern', function () {
      var trie = new Trie()

      assert.throws(function () {
        trie.define('()')
      }, Error, 'Regex like but not')

      assert.throws(function () {
        trie.define('/abc()')
      }, Error, 'Regex like but not')

      assert.throws(function () {
        trie.define('/abc?')
      }, Error, 'Regex like but not')

      assert.throws(function () {
        trie.define('/abc[]')
      }, Error, 'Regex like but not')
    })
  })

  describe('trie.match', function () {
    it('trie.match', function () {
      var trie = new Trie()

      var node = trie.define('/')
      var match = trie.match('/')
      assert.strictEqual(node, match.node)
      assert.deepEqual(match.params, {})
      assert.strictEqual(match.node, trie.match('').node)
      assert.strictEqual(null, trie.match('/path'))
      assert.strictEqual(null, trie.match('path'))

      trie = new Trie()
      node = trie.define('/:type')
      match = trie.match('/post')
      assert.deepEqual(match.params, {
        type: 'post'
      })
      assert.strictEqual(node, match.node)
      assert.strictEqual(node, trie.match('/task').node)

      trie = new Trie()
      node = trie.define('/:type/:id([1-9a-z]{6})')
      match = trie.match('/post/a12345')
      assert.deepEqual(match.params, {
        type: 'post',
        id: 'a12345'
      })
      assert.strictEqual(node, match.node)
      assert.strictEqual(node, trie.match('/task/aaabbb').node)
      assert.strictEqual(null, trie.match('/task/aaabbbc'))
      assert.strictEqual(null, trie.match('/task/aaabbb/ccc'))
      assert.strictEqual(null, trie.match('/task/aaabb'))
      assert.strictEqual(null, trie.match('/task'))

      trie = new Trie()
      node = trie.define('/post|task/([1-9a-z]{6})')
      assert.strictEqual(trie.define('/(post|task)/([1-9a-z]{6})'), node)
      assert.deepEqual(trie.match('/post/a12345').params, {})
      assert.strictEqual(trie.match('/post/a12345').node, node)
      assert.deepEqual(trie.match('/task/a12345').params, {})
      assert.strictEqual(trie.match('/task/a12345').node, node)
      assert.strictEqual(trie.match('/event/a12345'), null)
      assert.strictEqual(trie.match('/task/a123456'), null)
      assert.strictEqual(trie.match('/task/a12345/6'), null)
      assert.strictEqual(trie.match('/post'), null)
      assert.strictEqual(trie.match('/'), null)

      trie = new Trie()
      node = trie.define('/:type(post|task)/:id([1-9a-z]{6})')
      assert.deepEqual(trie.match('/post/a12345').params, {
        type: 'post',
        id: 'a12345'
      })
      assert.strictEqual(trie.match('/post/a12345').node, node)
      assert.deepEqual(trie.match('/task/a12345').params, {
        type: 'task',
        id: 'a12345'
      })
      assert.strictEqual(trie.match('/task/a12345').node, node)

      trie = new Trie()
      var node1 = trie.define('/:type')
      var node2 = trie.define('/:type/:id')
      assert.deepEqual(trie.match('/post').params, {
        type: 'post'
      })
      assert.strictEqual(trie.match('/post').node, node1)
      assert.deepEqual(trie.match('/task').params, {
        type: 'task'
      })
      assert.strictEqual(trie.match('/task').node, node1)
      assert.deepEqual(trie.match('/post/123456').params, {
        type: 'post',
        id: '123456'
      })
      assert.strictEqual(trie.match('/post/123456').node, node2)
      assert.deepEqual(trie.match('/task/123456').params, {
        type: 'task',
        id: '123456'
      })
      assert.strictEqual(trie.match('/task/123456').node, node2)

      trie = new Trie()
      node1 = trie.define('/:user(user|admin)/:id([1-9]{6})')
      node2 = trie.define('/:type(post|task)/:id([a-z]{6})')
      assert.deepEqual(trie.match('/post/aaaaaa').params, {
        type: 'post',
        id: 'aaaaaa'
      })
      assert.strictEqual(trie.match('/post/aaaaaa').node, node2)
      assert.deepEqual(trie.match('/task/aaaaaa').params, {
        type: 'task',
        id: 'aaaaaa'
      })
      assert.strictEqual(trie.match('/task/aaaaaa').node, node2)
      assert.strictEqual(trie.match('/task/111111'), null)
      assert.deepEqual(trie.match('/admin/123456').params, {
        user: 'admin',
        id: '123456'
      })
      assert.strictEqual(trie.match('/admin/123456').node, node1)
      assert.deepEqual(trie.match('/user/123456').params, {
        user: 'user',
        id: '123456'
      })
      assert.strictEqual(trie.match('/user/123456').node, node1)
      assert.strictEqual(trie.match('/user/aaaaaa'), null)

      trie = new Trie()
      trie.define('/post/:id([a-z]+)')
      assert.deepEqual(trie.match('/post/abc').params, {
        id: 'abc'
      })
      assert.strictEqual(trie.match('/post/ABC'), null)
      assert.strictEqual(trie.match('/Post/abc'), null)

      trie = new Trie(true)
      trie.define('/post/:id([a-z]+)')
      assert.deepEqual(trie.match('/post/abc').params, {
        id: 'abc'
      })
      assert.deepEqual(trie.match('/post/ABC').params, {
        id: 'ABC'
      })
      assert.deepEqual(trie.match('/Post/abc').params, {
        id: 'abc'
      })

      trie = new Trie()
      node = trie.define('(*)')
      assert.strictEqual(trie.match('').node, node)
      assert.strictEqual(trie.match('/').node, node)
      assert.strictEqual(trie.match('/x').node, node)
      assert.strictEqual(trie.match('/x/y/z').node, node)
      assert.deepEqual(trie.match('/post/abc').params, {})

      trie = new Trie()
      node = trie.define(':all(*)')
      assert.deepEqual(trie.match('').params, {
        all: ''
      })
      assert.deepEqual(trie.match('/').params, {
        all: ''
      })
      assert.deepEqual(trie.match('/post/abc').params, {
        all: 'post/abc'
      })

      trie = new Trie()
      var node0 = trie.define('')
      node = trie.define('/:all(*)')
      assert.notStrictEqual(node0, node)
      assert.notStrictEqual(trie.match('/').node, node)
      assert.strictEqual(trie.match('/x').node, node)
      assert.deepEqual(trie.match('').params, {})
      assert.deepEqual(trie.match('/').params, {})
      assert.deepEqual(trie.match('/post/abc').params, {
        all: 'post/abc'
      })

      trie = new Trie()
      node = trie.define('/:all(*)')
      assert.strictEqual(trie.match('').node, node)
      assert.strictEqual(trie.match('/').node, node)
      assert.strictEqual(trie.match('/x').node, node)

      trie = new Trie()
      node = trie.define('/:type/:other(*)')
      assert.strictEqual(trie.match('/post'), null)
      assert.strictEqual(trie.match('/post/x').node, node)

      trie = new Trie()
      node = trie.define('/:type/:other(*)')
      trie.define('/:type')
      trie.define('/post')
      assert.notStrictEqual(trie.define('/post'), node)
      assert.notStrictEqual(trie.define('/:type'), node)
      assert.strictEqual(trie.match('/post/abc'), null)
      assert.deepEqual(trie.match('').params, {
        type: ''
      })
      assert.deepEqual(trie.match('/').params, {
        type: ''
      })
      assert.deepEqual(trie.match('/post').params, {})
      assert.deepEqual(trie.match('/task').params, {
        type: 'task'
      })
      assert.deepEqual(trie.match('/task/abc').params, {
        type: 'task',
        other: 'abc'
      })
      assert.deepEqual(trie.match('/event/x/y/z').params, {
        type: 'event',
        other: 'x/y/z'
      })

      trie = new Trie()
      trie.define('/prefix:name/:other(*)')
      trie.define('/test.com::name')
      trie.define('/post')
      assert.strictEqual(trie.match('/prefix'), null)
      assert.deepEqual(trie.match('/prefix/123').params, {
        name: '',
        other: '123'
      })
      assert.deepEqual(trie.match('/prefix123/456').params, {
        name: '123',
        other: '456'
      })
      assert.deepEqual(trie.match('/prefix123/456/789').params, {
        name: '123',
        other: '456/789'
      })

      assert.strictEqual(trie.match('/test.com'), null)
      assert.deepEqual(trie.match('/test.com:').params, {
        name: ''
      })
      assert.deepEqual(trie.match('/test.com:zensh').params, {
        name: 'zensh'
      })
      assert.strictEqual(trie.match('/test.com:zensh/test'), null)
    })

    it('trie.match, multiMatch', function () {
      var trie = new Trie()

      var node1 = trie.define('/')
      var node2 = trie.define('/:type')
      var node3 = trie.define('/:type/:id([a-z0-9]{6})')

      var match = trie.match('/', true)
      assert.strictEqual(match.nodes.length, 1)
      assert.strictEqual(match.nodes[0], node1)
      assert.deepEqual(match.params, {})

      // should not match node1(root node)!
      match = trie.match('/post', true)
      assert.strictEqual(match.nodes.length, 1)
      assert.strictEqual(match.nodes[0], node2)
      assert.deepEqual(match.params, {type: 'post'})

      match = trie.match('/post/abcdef', true)
      assert.strictEqual(match.nodes.length, 2)
      assert.strictEqual(match.nodes[0], node2)
      assert.strictEqual(match.nodes[1], node3)
      assert.deepEqual(match.params, {type: 'post', id: 'abcdef'})

      match = trie.match('/post/abcdef/xyz', true)
      assert.strictEqual(match.nodes.length, 2)
      assert.strictEqual(match.nodes[0], node2)
      assert.strictEqual(match.nodes[1], node3)
      assert.deepEqual(match.params, {type: 'post', id: 'abcdef'})

      match = trie.match('/post/abcdef/xyz/123', true)
      assert.strictEqual(match.nodes.length, 2)
      assert.strictEqual(match.nodes[0], node2)
      assert.strictEqual(match.nodes[1], node3)
      assert.deepEqual(match.params, {type: 'post', id: 'abcdef'})
    })
  })
})
