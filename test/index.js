'use strict'

const assert = require('assert')
const tman = require('tman')
const Trie = require('..')

tman.suite('trie.define', function () {
  tman.it('root pattern', function () {
    let trie = new Trie()

    let node = trie.define('/')
    assert.strictEqual(node, trie.define(''))
    assert.strictEqual(node.pattern, '/')
    assert.strictEqual(node.name, '')

    assert.strictEqual(node.parent, trie.root)
    assert.strictEqual(trie.root.parent, null)
  })

  tman.it('simple pattern', function () {
    let trie = new Trie()

    let node = trie.define('/a/b')
    assert.strictEqual(node.name, '')
    assert.strictEqual(node, trie.define('a/b'))
    assert.strictEqual(node.pattern, '/a/b')
    assert.notEqual(node, trie.define('a/b/'))
    assert.notEqual(node, trie.define('/a/b/'))
    assert.strictEqual(trie.define('/a/b/'), trie.define('a/b/'))

    let parent = trie.define('/a')
    assert.strictEqual(node.parent, parent)
    let child = trie.define('/a/b/c')
    assert.strictEqual(child.parent, node)

    assert.throws(() => trie.define('/a//b'))
  })

  tman.it('double colon pattern', function () {
    let trie = new Trie()

    let node = trie.define('/a/::b')
    assert.strictEqual(node.name, '')
    assert.notEqual(node, trie.define('/a/::'))
    assert.notEqual(node, trie.define('/a/::x'))

    let parent = trie.define('/a')
    assert.strictEqual(node.parent, parent)
    assert.notEqual(parent.varyChild, node)
    assert.strictEqual(parent.children[':'], trie.define('/a/::'))
    assert.strictEqual(parent.children[':b'], trie.define('/a/::b'))
    assert.strictEqual(parent.children[':x'], trie.define('/a/::x'))

    let child = trie.define('/a/::b/c')
    assert.strictEqual(child.parent, node)
    assert.strictEqual(node.children['c'], child)
  })

  tman.it('named pattern', function () {
    let trie = new Trie()

    assert.throws(() => trie.define('/a/:'))
    assert.throws(() => trie.define('/a/:/'))
    assert.throws(() => trie.define('/a/:abc$/'))

    let node = trie.define('/a/:b')
    assert.strictEqual(node.name, 'b')
    assert.strictEqual(node.wildcard, false)
    assert.strictEqual(node.varyChild, null)
    assert.strictEqual(node.pattern, '/a/:b')
    assert.throws(() => trie.define('/a/:x'))

    let parent = trie.define('/a')
    assert.strictEqual(parent.name, '')
    assert.strictEqual(parent.varyChild, node)
    assert.strictEqual(node.parent, parent)

    let child = trie.define('/a/:b/c')
    assert.strictEqual(child.parent, node)
    assert.throws(() => trie.define('/a/:x/c'))
  })

  tman.it('wildcard pattern', function () {
    let trie = new Trie()

    assert.throws(() => trie.define('/a/*'))
    assert.throws(() => trie.define('/a/:*'))
    assert.throws(() => trie.define('/a/:#*'))
    assert.throws(() => trie.define('/a/:abc(*'))

    let node = trie.define('/a/:b*')
    assert.strictEqual(node.name, 'b')
    assert.strictEqual(node.wildcard, true)
    assert.strictEqual(node.varyChild, null)
    assert.strictEqual(node.pattern, '/a/:b*')
    assert.throws(() => trie.define('/a/:x*'))

    let parent = trie.define('/a')
    assert.strictEqual(parent.name, '')
    assert.strictEqual(parent.wildcard, false)
    assert.strictEqual(parent.varyChild, node)
    assert.strictEqual(node.parent, parent)

    assert.throws(() => trie.define('/a/:b*/c'))
    trie.define('/a/bc')
    trie.define('/a/b/c')
    assert.strictEqual(node, trie.define('/a/:b*'))
  })

  tman.it('regexp pattern', function () {
    let trie = new Trie()

    assert.throws(() => trie.define('/a/('))
    assert.throws(() => trie.define('/a/)'))
    assert.throws(() => trie.define('/a/:('))
    assert.throws(() => trie.define('/a/:)'))
    assert.throws(() => trie.define('/a/:()'))
    assert.throws(() => trie.define('/a/:bc)'))
    assert.throws(() => trie.define('/a/:bc()'))
    assert.throws(() => trie.define('/a/:(bc)'))
    assert.throws(() => trie.define('/a/:#(bc)'))
    assert.throws(() => trie.define('/a/:b(c)*'))

    let node = trie.define('/a/:b(x|y|z)')
    assert.strictEqual(node.name, 'b')
    assert.strictEqual(node.pattern, '/a/:b(x|y|z)')
    assert.strictEqual(node.wildcard, false)
    assert.strictEqual(node.varyChild, null)
    assert.strictEqual(node, trie.define('/a/:b(x|y|z)'))
    assert.throws(() => trie.define('/a/:b(xyz)'))
    assert.throws(() => trie.define('/a/:x(x|y|z)'))

    let parent = trie.define('/a')
    assert.strictEqual(parent.name, '')
    assert.strictEqual(parent.wildcard, false)
    assert.strictEqual(parent.varyChild, node)
    assert.strictEqual(node.parent, parent)

    let child = trie.define('/a/:b(x|y|z)/c')
    assert.strictEqual(child.parent, node)
    assert.throws(() => trie.define('/a/:x(x|y|z)/c'))
  })

  tman.it('ignoreCase option', function () {
    let trie = new Trie({ignoreCase: true})
    let node = trie.define('/A/b')
    assert.strictEqual(node, trie.define('/a/b'))
    assert.strictEqual(node, trie.define('/a/B'))

    node = trie.define('/::A/b')
    assert.strictEqual(node, trie.define('/::a/b'))

    trie = new Trie({ignoreCase: false})
    node = trie.define('/A/b')
    assert.notEqual(node, trie.define('/a/b'))
    assert.notEqual(node, trie.define('/a/B'))

    node = trie.define('/::A/b')
    assert.notEqual(node, trie.define('/::a/b'))
  })

  tman.it('throw error when not a string', function () {
    let trie = new Trie()

    assert.throws(() => {
      trie.define(1)
    }, TypeError, 'Pattern must be string.')

    assert.throws(() => {
      trie.define()
    }, TypeError, 'Pattern must be string.')
  })

  tman.it('throw error when multi-slash exist', function () {
    let trie = new Trie()

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
})

tman.suite.skip('trie.match', function () {
  tman.it('trie.match', function () {
    let trie = new Trie()

    let node = trie.define('/')
    let match = trie.match('/')
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
    node = trie.define('/((post|task)s?)/([\\w\\d]{6})')
    assert.deepEqual(trie.match('/post/a12345').params, {})
    assert.strictEqual(trie.match('/post/a12345').node, node)
    assert.deepEqual(trie.match('/posts/a12345').params, {})
    assert.strictEqual(trie.match('/posts/a12345').node, node)
    assert.deepEqual(trie.match('/task/a12345').params, {})
    assert.strictEqual(trie.match('/task/a12345').node, node)
    assert.deepEqual(trie.match('/tasks/a12345').params, {})
    assert.strictEqual(trie.match('/tasks/a12345').node, node)
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
    node = trie.define('/:type((post|task)s?)/:id([\\w\\d]{6})')
    assert.deepEqual(trie.match('/post/a12345').params, {
      type: 'post',
      id: 'a12345'
    })
    assert.strictEqual(trie.match('/post/a12345').node, node)
    assert.deepEqual(trie.match('/tasks/a12345').params, {
      type: 'tasks',
      id: 'a12345'
    })
    assert.strictEqual(trie.match('/tasks/a12345').node, node)

    trie = new Trie()
    let node1 = trie.define('/:type')
    let node2 = trie.define('/:type/:id')
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
    let node0 = trie.define('')
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

  tman.it('trie.match, multiMatch', function () {
    let trie = new Trie()

    let node1 = trie.define('/')
    let node2 = trie.define('/:type')
    let node3 = trie.define('/:type/:id([a-z0-9]{6})')

    let match = trie.match('/', true)
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
