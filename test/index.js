'use strict'
/*global describe, it*/

var assert = require('assert')
var Trie = require('../index.js')

describe('route-trie', function () {
  it('trie.define', function () {
    var trie = new Trie()

    assert.throws(function () {
      trie.define(1)
    }, Error)

    var node = trie.define('/')
    assert.strictEqual(node, trie.define(''))
    assert.throws(function () {
      trie.define('///')
    }, null, 'Multi-slash exist.')

    node = trie.define('/path1/path2')
    assert.strictEqual(node._nodeState.pattern, '/path1/path2')
    assert.strictEqual(node, trie.define('path1/path2'))
    assert.strictEqual(node, trie.define('/path1/path2/'))

    assert.throws(function () {
      trie.define('//path1/path2')
    }, null, 'Multi-slash exist.')

    assert.throws(function () {
      trie.define('/path1///path2')
    }, null, 'Multi-slash exist.')

    assert.throws(function () {
      trie.define('/path1/path2()/')
    }, null, 'Empty bracketR exist.')

    assert.notStrictEqual(node, trie.define('/path1/path2/path3'))
    assert.notStrictEqual(node, trie.define('/path1/:path2'))
    assert.notStrictEqual(node, trie.define('/path2/path2'))

    node = trie.define('/path1/:path2/path3')
    assert.strictEqual(node, trie.define('/path1/:path22/path3'))
    assert.notStrictEqual(node, trie.define('/path1/:path22(a|b)/path3'))
    assert.strictEqual(node._nodeState.pattern, '/path1/:path2/path3')

    assert.notStrictEqual(trie.define('/Post'), trie.define('/post'))

    trie = new Trie()
    node = trie.define('/*')
    assert.notStrictEqual(node, trie.define('/'))
    assert.notStrictEqual(node, trie.define('/post'))
    assert.throws(function () {
      trie.define('/(*)')
    }, null, 'Can not define more regex pattern while "*" pattern defined.')
    assert.throws(function () {
      trie.define('/(a|b)')
    }, null, 'Can not define more regex pattern while "*" pattern defined.')
    assert.throws(function () {
      trie.define('/(*)/post')
    }, null, 'Can not define regex pattern after "*" pattern')

    trie = new Trie()
    node = trie.define('/test:name(a|b)')
    assert.notStrictEqual(node, trie.define('/test:name(c|d)'))
    assert.notStrictEqual(node, trie.define('/test::name(a|b)'))
  })

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
    assert.strictEqual(trie.define('/post|task/[1-9a-z]{6}'), node)
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
    assert.strictEqual(trie.define('/:type1(post|task)/[1-9a-z]{6}'), node)
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
    node = trie.define('*')
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
    node = trie.define('/:all*')
    trie.define('')
    assert.notStrictEqual(trie.define(''), node)
    assert.notStrictEqual(trie.match('/').node, node)
    assert.strictEqual(trie.match('/x').node, node)
    assert.deepEqual(trie.match('').params, {})
    assert.deepEqual(trie.match('/').params, {})
    assert.deepEqual(trie.match('/post/abc').params, {
      all: 'post/abc'
    })

    trie = new Trie()
    node = trie.define('/:all*')
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
    var node3 = trie.define('/:type/:id([a-z0-9]{6}')

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
