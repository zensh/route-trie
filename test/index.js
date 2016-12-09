'use strict'

const assert = require('assert')
const tman = require('tman')
const Trie = require('..')

tman.suite('trie.define', function () {
  tman.it('root pattern', function () {
    let trie = new Trie()

    let node = trie.define('/')
    assert.strictEqual(trie.define(''), node)
    assert.strictEqual(node.pattern, '/')
    assert.strictEqual(node.name, '')

    assert.strictEqual(node.parent, trie.root)
    assert.strictEqual(trie.root.parent, null)
  })

  tman.it('simple pattern', function () {
    let trie = new Trie()

    let node = trie.define('/a/b')
    assert.strictEqual(node.name, '')
    assert.strictEqual(node.pattern, '/a/b')
    assert.strictEqual(node, trie.define('a/b'))
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

tman.suite('trie.match', function () {
  tman.it('root pattern', function () {
    let trie = new Trie()
    let node = trie.define('/')
    let res = trie.match('/')

    assert.deepEqual(res.params, {})
    assert.strictEqual(node, res.node)

    assert.throws(() => trie.match(''))
    assert.throws(() => trie.match('a'))
    assert.throws(() => trie.match(1))
    assert.strictEqual(trie.match('/a').node, null)
  })

  tman.it('simple pattern', function () {
    let trie = new Trie()
    let node = trie.define('/a/b')
    let res = trie.match('/a/b')

    assert.deepEqual(res.params, {})
    assert.strictEqual(node, res.node)

    assert.strictEqual(trie.match('/a').node, null)
    assert.strictEqual(trie.match('/a/b/c').node, null)
    assert.strictEqual(trie.match('/a/x/c').node, null)
  })

  tman.it('double colon pattern', function () {
    let trie = new Trie()
    let node = trie.define('/a/::b')
    let res = trie.match('/a/:b')

    assert.deepEqual(res.params, {})
    assert.strictEqual(node, res.node)
    assert.strictEqual(trie.match('/a').node, null)
    assert.strictEqual(trie.match('/a/::b').node, null)

    node = trie.define('/a/::b/c')
    res = trie.match('/a/:b/c')
    assert.deepEqual(res.params, {})
    assert.strictEqual(node, res.node)
    assert.strictEqual(trie.match('/a/::b/c').node, null)

    node = trie.define('/a/::')
    res = trie.match('/a/:')
    assert.deepEqual(res.params, {})
    assert.strictEqual(node, res.node)
    assert.strictEqual(trie.match('/a/::').node, null)
  })

  tman.it('named pattern', function () {
    let trie = new Trie()
    let node = trie.define('/a/:b')
    let res = trie.match('/a/xyz汉')

    assert.strictEqual('xyz汉', res.params['b'])
    assert.strictEqual(undefined, res.params['x'])
    assert.strictEqual(node, res.node)
    assert.strictEqual(trie.match('/a').node, null)
    assert.strictEqual(trie.match('/a/xyz汉/123').node, null)

    let node2 = trie.define('/:a/:b')
    let res2 = trie.match('/a/xyz汉')
    assert.strictEqual(node, res2.node)

    res2 = trie.match('/ab/xyz汉')
    assert.strictEqual('xyz汉', res2.params['b'])
    assert.strictEqual('ab', res2.params['a'])
    assert.strictEqual(node2, res2.node)
    assert.strictEqual(trie.match('/ab').node, null)
    assert.strictEqual(trie.match('/ab/xyz汉/123').node, null)
  })

  tman.it('wildcard pattern', function () {
    let trie = new Trie()
    let node = trie.define('/a/:b*')
    let res = trie.match('/a/xyz汉')

    assert.strictEqual('xyz汉', res.params['b'])
    assert.strictEqual(node, res.node)
    assert.strictEqual(trie.match('/a').node, null)

    res = trie.match('/a/xyz汉/123')
    assert.strictEqual('xyz汉/123', res.params['b'])
    assert.strictEqual(node, res.node)

    node = trie.define('/:a*')
    assert.strictEqual(trie.match('/a').node, null)
    res = trie.match('/123')
    assert.strictEqual('123', res.params['a'])
    assert.strictEqual(node, res.node)
    res = trie.match('/123/xyz汉')
    assert.strictEqual('123/xyz汉', res.params['a'])
    assert.strictEqual(node, res.node)
  })

  tman.it('regexp pattern', function () {
    let trie = new Trie()
    let node = trie.define('/a/:b(^(x|y|z)$)')
    let res = trie.match('/a/x')

    assert.strictEqual('x', res.params['b'])
    assert.strictEqual(node, res.node)
    res = trie.match('/a/y')
    assert.strictEqual('y', res.params['b'])
    assert.strictEqual(node, res.node)
    res = trie.match('/a/z')
    assert.strictEqual('z', res.params['b'])
    assert.strictEqual(node, res.node)

    assert.strictEqual(trie.match('/a').node, null)
    assert.strictEqual(trie.match('/a/xy').node, null)
    assert.strictEqual(trie.match('/a/x/y').node, null)

    let child = trie.define('/a/:b(^(x|y|z)$)/c')
    res = trie.match('/a/x/c')
    assert.strictEqual('x', res.params['b'])
    assert.strictEqual(child, res.node)
    res = trie.match('/a/y/c')
    assert.strictEqual('y', res.params['b'])
    assert.strictEqual(child, res.node)
    res = trie.match('/a/z/c')
    assert.strictEqual('z', res.params['b'])
    assert.strictEqual(child, res.node)
  })

  tman.it('IgnoreCase option', function () {
    // IgnoreCase = true
    let trie = new Trie({ignoreCase: true})
    let node = trie.define('/A/:Name')
    let res = trie.match('/a/x')

    assert.strictEqual(node, res.node)
    assert.strictEqual('x', res.params['Name'])
    assert.strictEqual(undefined, res.params['name'])

    res = trie.match('/A/X')
    assert.strictEqual(node, res.node)
    assert.strictEqual('X', res.params['Name'])
    assert.strictEqual(undefined, res.params['name'])

    node = trie.define('/::A/:Name')

    res = trie.match('/:a/x')
    assert.strictEqual(node, res.node)
    assert.strictEqual('x', res.params['Name'])
    assert.strictEqual(undefined, res.params['name'])

    res = trie.match('/:A/X')
    assert.strictEqual(node, res.node)
    assert.strictEqual('X', res.params['Name'])
    assert.strictEqual(undefined, res.params['name'])

    // IgnoreCase = false
    trie = new Trie({ignoreCase: false})
    node = trie.define('/A/:Name')

    assert.strictEqual(trie.match('/a/x').node, null)
    res = trie.match('/A/X')
    assert.strictEqual(node, res.node)
    assert.strictEqual('X', res.params['Name'])

    node = trie.define('/::A/:Name')
    assert.strictEqual(trie.match('/:a/x').node, null)
    res = trie.match('/:A/X')
    assert.strictEqual(node, res.node)
    assert.strictEqual('X', res.params['Name'])
    assert.strictEqual(undefined, res.params['name'])
  })

  tman.it('FixedPathRedirect option', function () {
    // FixedPathRedirect = false
    let trie = new Trie({fixedPathRedirect: false})
    let node1 = trie.define('/abc/efg')
    let node2 = trie.define('/abc/xyz/')

    assert.strictEqual(trie.match('/abc/efg').node, node1)
    assert.strictEqual(trie.match('/abc/efg').fpr, '')
    assert.strictEqual(trie.match('/abc//efg').node, null)
    assert.strictEqual(trie.match('/abc//efg').fpr, '')

    assert.strictEqual(trie.match('/abc/xyz/').node, node2)
    assert.strictEqual(trie.match('/abc/xyz/').fpr, '')
    assert.strictEqual(trie.match('/abc/xyz//').node, null)
    assert.strictEqual(trie.match('/abc/xyz//').fpr, '')

    // FixedPathRedirect = true
    trie = new Trie({fixedPathRedirect: true})
    node1 = trie.define('/abc/efg')
    node2 = trie.define('/abc/xyz/')

    assert.strictEqual(trie.match('/abc/efg').node, node1)
    assert.strictEqual(trie.match('/abc/efg').fpr, '')
    assert.strictEqual(trie.match('/abc//efg').node, null)
    assert.strictEqual(trie.match('/abc//efg').fpr, '/abc/efg')
    assert.strictEqual(trie.match('/abc///efg').node, null)
    assert.strictEqual(trie.match('/abc///efg').fpr, '/abc/efg')

    assert.strictEqual(trie.match('/abc/xyz/').node, node2)
    assert.strictEqual(trie.match('/abc/xyz/').fpr, '')
    assert.strictEqual(trie.match('/abc/xyz//').node, null)
    assert.strictEqual(trie.match('/abc/xyz//').fpr, '/abc/xyz/')
    assert.strictEqual(trie.match('/abc/xyz////').node, null)
    assert.strictEqual(trie.match('/abc/xyz////').fpr, '/abc/xyz/')
  })

  tman.it('TrailingSlashRedirect option', function () {
    // TrailingSlashRedirect = false
    let trie = new Trie({trailingSlashRedirect: false})
    let node1 = trie.define('/abc/efg')
    let node2 = trie.define('/abc/xyz/')

    assert.strictEqual(trie.match('/abc/efg').node, node1)
    assert.strictEqual(trie.match('/abc/efg').tsr, '')
    assert.strictEqual(trie.match('/abc/efg/').node, null)
    assert.strictEqual(trie.match('/abc/efg/').tsr, '')

    assert.strictEqual(trie.match('/abc/xyz/').node, node2)
    assert.strictEqual(trie.match('/abc/xyz/').tsr, '')
    assert.strictEqual(trie.match('/abc/xyz').node, null)
    assert.strictEqual(trie.match('/abc/xyz').tsr, '')

    // TrailingSlashRedirect = true
    trie = new Trie({rrailingSlashRedirect: true})
    node1 = trie.define('/abc/efg')
    node2 = trie.define('/abc/xyz/')

    assert.strictEqual(trie.match('/abc/efg').node, node1)
    assert.strictEqual(trie.match('/abc/efg').tsr, '')
    assert.strictEqual(trie.match('/abc/efg/').node, null)
    assert.strictEqual(trie.match('/abc/efg/').tsr, '/abc/efg')

    assert.strictEqual(trie.match('/abc/xyz/').node, node2)
    assert.strictEqual(trie.match('/abc/xyz/').tsr, '')
    assert.strictEqual(trie.match('/abc/xyz').node, null)
    assert.strictEqual(trie.match('/abc/xyz').tsr, '/abc/xyz/')

    // TrailingSlashRedirect = true and FixedPathRedirect = true
    trie = new Trie({fixedPathRedirect: true, frailingSlashRedirect: true})
    node1 = trie.define('/abc/efg')
    node2 = trie.define('/abc/xyz/')

    assert.strictEqual(trie.match('/abc//efg/').node, null)
    assert.strictEqual(trie.match('/abc//efg/').tsr, '')
    assert.strictEqual(trie.match('/abc//efg/').fpr, '/abc/efg')

    assert.strictEqual(trie.match('/abc//xyz').node, null)
    assert.strictEqual(trie.match('/abc//xyz').tsr, '')
    assert.strictEqual(trie.match('/abc//xyz').fpr, '/abc/xyz/')
  })
})

tman.suite('trie node', function () {
  tman.it('Node Handle', function () {
    let handler = () => {}
    let trie = new Trie()

    assert.throws(() => trie.define('/').handle('GET', 123))
    trie.define('/').handle('GET', handler)
    trie.define('/').handle('PUT', handler)
    trie.define('/api').handle('GET', handler)

    assert.throws(() => trie.define('/').handle('GET', handler))
    assert.throws(() => trie.define('/').handle('PUT', handler))
    assert.throws(() => trie.define('/api').handle('GET', handler))

    assert.strictEqual(trie.match('/').node.getHandler('GET'), handler)
    assert.strictEqual(trie.match('/').node.getHandler('PUT'), handler)
    assert.strictEqual(trie.match('/').node.getAllow(), 'GET, PUT')

    assert.strictEqual(trie.match('/api').node.getHandler('GET'), handler)
    assert.strictEqual(trie.match('/api').node.getHandler('PUT'), null)
    assert.strictEqual(trie.match('/api').node.getAllow(), 'GET')
  })
})
