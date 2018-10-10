'use strict'

const assert = require('assert')
const tman = require('tman')

test(require('..'))
test(require('@std/esm')(module)('../index.mjs').default)

function test (Trie) {
  tman.suite('trie.define', function () {
    tman.it('root pattern', function () {
      const trie = new Trie()

      const node = trie.define('/')
      assert.strictEqual(trie.define(''), node)
      assert.strictEqual(node.pattern, '/')
      assert.strictEqual(node.name, '')

      assert.strictEqual(node.parent, trie.root)
      assert.strictEqual(trie.root.parent, null)
    })

    tman.it('simple pattern', function () {
      const trie = new Trie()

      const node = trie.define('/a/b')
      assert.strictEqual(node.name, '')
      assert.strictEqual(node.pattern, '/a/b')
      assert.strictEqual(node, trie.define('a/b'))
      assert.notEqual(node, trie.define('a/b/'))
      assert.notEqual(node, trie.define('/a/b/'))
      assert.strictEqual(trie.define('/a/b/'), trie.define('a/b/'))

      const parent = trie.define('/a')
      assert.strictEqual(node.parent, parent)
      const child = trie.define('/a/b/c')
      assert.strictEqual(child.parent, node)

      assert.throws(() => trie.define('/a//b'))
    })

    tman.it('double colon pattern', function () {
      const trie = new Trie()

      const node = trie.define('/a/::b')
      assert.strictEqual(node.name, '')
      assert.notEqual(node, trie.define('/a/::'))
      assert.notEqual(node, trie.define('/a/::x'))

      const parent = trie.define('/a')
      assert.strictEqual(node.parent, parent)
      assert.notEqual(parent.varyChildren, node)
      assert.strictEqual(parent.children[':'], trie.define('/a/::'))
      assert.strictEqual(parent.children[':b'], trie.define('/a/::b'))
      assert.strictEqual(parent.children[':x'], trie.define('/a/::x'))

      const child = trie.define('/a/::b/c')
      assert.strictEqual(child.parent, node)
      assert.strictEqual(node.children['c'], child)
    })

    tman.it('named pattern', function () {
      const trie = new Trie()

      assert.throws(() => trie.define('/a/:'))
      assert.throws(() => trie.define('/a/:/'))
      assert.throws(() => trie.define('/a/:abc$/'))

      const node = trie.define('/a/:b')
      assert.strictEqual(node.name, 'b')
      assert.strictEqual(node.wildcard, false)
      assert.deepEqual(node.varyChildren, [])
      assert.strictEqual(node.pattern, '/a/:b')
      assert.throws(() => trie.define('/a/:x'))

      const parent = trie.define('/a')
      assert.strictEqual(parent.name, '')
      assert.strictEqual(parent.varyChildren[0], node)
      assert.strictEqual(node.parent, parent)

      const child = trie.define('/a/:b/c')
      assert.strictEqual(child.parent, node)
      assert.throws(() => trie.define('/a/:x/c'))
    })

    tman.it('named pattern with suffix', function () {
      const tr1 = new Trie()
      assert.throws(() => tr1.Define('/a/:+'))
      assert.throws(() => tr1.Define('/a/:+a'))

      const node1 = tr1.define('/a/:b')
      assert.strictEqual(node1.name, 'b')
      assert.strictEqual(node1.wildcard, false)
      assert.strictEqual(node1.varyChildren.length, 0)
      assert.strictEqual(node1.parent.varyChildren.length, 1)
      assert.strictEqual(node1.pattern, '/a/:b')

      const parent = tr1.define('/a')
      assert.strictEqual(parent.name, '')
      assert.strictEqual(parent.varyChildren[0], node1)
      assert.strictEqual(node1.parent, parent)

      const node2 = tr1.define('/a/:b+:undelete')
      assert.strictEqual(node2.name, 'b')
      assert.strictEqual(node2.wildcard, false)
      assert.strictEqual(node2.varyChildren.length, 0)
      assert.strictEqual(node2.parent.varyChildren.length, 2)
      assert.strictEqual(node2.pattern, '/a/:b+:undelete')
      assert.strictEqual(tr1.define('/a/:b+:undelete'), node2)
      assert.strictEqual(parent.varyChildren[0], node2)
      assert.strictEqual(parent.varyChildren[1], node1)

      assert.throws(() => tr1.define('/a/:x'))
      assert.throws(() => tr1.Define('/a/:x+:undelete'))

      const child = tr1.define('/a/:b+:undelete/c')
      assert.strictEqual(child.parent, node2)
      assert.throws(() => tr1.Define('/a/:x/c'))

      const node3 = tr1.define('/a/:b+:delete')
      assert.strictEqual(parent.varyChildren[0], node2)
      assert.strictEqual(parent.varyChildren[1], node3)
      assert.strictEqual(parent.varyChildren[2], node1)

      const tr2 = new Trie()
      tr2.define('/a/:b/c')
      tr2.define('/a/:b+:delete')
      assert.throws(() => tr2.define('/a/:x+:delete'))
      tr2.define('/a/:b(xyz)+:delete')
    })

    tman.it('wildcard pattern', function () {
      const trie = new Trie()

      assert.throws(() => trie.define('/a/*'))
      assert.throws(() => trie.define('/a/:*'))
      assert.throws(() => trie.define('/a/:#*'))
      assert.throws(() => trie.define('/a/:abc(*'))

      const node = trie.define('/a/:b*')
      assert.strictEqual(node.name, 'b')
      assert.strictEqual(node.wildcard, true)
      assert.deepEqual(node.varyChildren, [])
      assert.strictEqual(node.pattern, '/a/:b*')
      assert.throws(() => trie.define('/a/:x*'))

      const parent = trie.define('/a')
      assert.strictEqual(parent.name, '')
      assert.strictEqual(parent.wildcard, false)
      assert.strictEqual(parent.varyChildren[0], node)
      assert.strictEqual(node.parent, parent)

      assert.throws(() => trie.define('/a/:b*/c'))
      trie.define('/a/bc')
      trie.define('/a/b/c')
      assert.strictEqual(node, trie.define('/a/:b*'))
    })

    tman.it('regexp pattern', function () {
      const trie = new Trie()

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

      const node = trie.define('/a/:b(x|y|z)')
      assert.strictEqual(node.name, 'b')
      assert.strictEqual(node.pattern, '/a/:b(x|y|z)')
      assert.strictEqual(node.wildcard, false)
      assert.deepEqual(node.varyChildren, [])
      assert.strictEqual(node, trie.define('/a/:b(x|y|z)'))
      assert.notStrictEqual(trie.define('/a/:b(xyz)'), node)
      assert.throws(() => trie.define('/a/:x(x|y|z)'))

      const parent = trie.define('/a')
      assert.strictEqual(parent.name, '')
      assert.strictEqual(parent.wildcard, false)
      assert.strictEqual(parent.varyChildren[0], node)
      assert.strictEqual(node.parent, parent)

      const child = trie.define('/a/:b(x|y|z)/c')
      assert.strictEqual(child.parent, node)
      assert.throws(() => trie.define('/a/:x(x|y|z)/c'))
    })

    tman.it('complex pattern', function () {
      const trie = new Trie()

      const p = trie.define('/a')
      const n1 = trie.define('/a/:b')
      assert.throws(() => trie.define('/a/:c'))

      const n2 = trie.define('/a/:c(x|y)')
      const n3 = trie.define('/a/:d+a1')
      const n4 = trie.define('/a/:b+a2')
      assert.throws(() => trie.define('/a/:bb+a2'))

      const n5 = trie.define('/a/:b(a+)+a2')
      const n6 = trie.define('/a/:b(b+)+a2')
      const n7 = trie.define('/a/:b(c+)')
      assert.throws(() => trie.define('/a/:bb(c+)'))
      const n8 = trie.define('/a/:w*')
      assert.throws(() => trie.define('/a/:b(d+)'))

      assert.strictEqual(p.varyChildren[0], n5)
      assert.strictEqual(p.varyChildren[1], n6)
      assert.strictEqual(p.varyChildren[2], n3)
      assert.strictEqual(p.varyChildren[3], n4)
      assert.strictEqual(p.varyChildren[4], n2)
      assert.strictEqual(p.varyChildren[5], n7)
      assert.strictEqual(p.varyChildren[6], n1)
      assert.strictEqual(p.varyChildren[7], n8)
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
      const trie = new Trie()

      assert.throws(() => {
        trie.define(1)
      }, TypeError, 'Pattern must be string.')

      assert.throws(() => {
        trie.define()
      }, TypeError, 'Pattern must be string.')
    })

    tman.it('throw error when multi-slash exist', function () {
      const trie = new Trie()

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
      const trie = new Trie()
      const node = trie.define('/')
      const res = trie.match('/')

      assert.deepEqual(res.params, {})
      assert.strictEqual(node, res.node)

      assert.throws(() => trie.match(''))
      assert.throws(() => trie.match('a'))
      assert.throws(() => trie.match(1))
      assert.strictEqual(trie.match('/a').node, null)
    })

    tman.it('simple pattern', function () {
      const trie = new Trie()
      const node = trie.define('/a/b')
      const res = trie.match('/a/b')

      assert.deepEqual(res.params, {})
      assert.strictEqual(node, res.node)

      assert.strictEqual(trie.match('/a').node, null)
      assert.strictEqual(trie.match('/a/b/c').node, null)
      assert.strictEqual(trie.match('/a/x/c').node, null)
    })

    tman.it('double colon pattern', function () {
      const trie = new Trie()
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
      const trie = new Trie()
      const node = trie.define('/a/:b')
      const res = trie.match('/a/xyz汉')

      assert.strictEqual('xyz汉', res.params['b'])
      assert.strictEqual(undefined, res.params['x'])
      assert.strictEqual(node, res.node)
      assert.strictEqual(trie.match('/a').node, null)
      assert.strictEqual(trie.match('/a/xyz汉/123').node, null)

      const node2 = trie.define('/:a/:b')
      let res2 = trie.match('/a/xyz汉')
      assert.strictEqual(node, res2.node)

      res2 = trie.match('/ab/xyz汉')
      assert.strictEqual('xyz汉', res2.params['b'])
      assert.strictEqual('ab', res2.params['a'])
      assert.strictEqual(node2, res2.node)
      assert.strictEqual(trie.match('/ab').node, null)
      assert.strictEqual(trie.match('/ab/xyz汉/123').node, null)
    })

    tman.it('named pattern with suffix', function () {
      const tr1 = new Trie()
      const node = tr1.define('/a/:b+:del')
      const res = tr1.match('/a/xyz汉:del')
      assert.strictEqual(res.params['b'], 'xyz汉')
      assert.strictEqual(res.params['x'], undefined)
      assert.strictEqual(node, res.node)
      assert.strictEqual(tr1.match('/a').node, null)
      assert.strictEqual(tr1.match('/a/:del').node, null)
      assert.strictEqual(tr1.match('/a/xyz汉').node, null)
      assert.strictEqual(tr1.match('/a/xyz汉:de').node, null)
      assert.strictEqual(tr1.match('/a/xyz汉/123').node, null)

      const node2 = tr1.define('/a/:b+del')
      const res2 = tr1.match('/a/xyz汉del')
      assert.strictEqual('xyz汉', res.params['b'])
      assert.strictEqual(node2, res2.node)
      assert.strictEqual(tr1.match('/a/xyz汉cel').node, null)
    })

    tman.it('wildcard pattern', function () {
      const trie = new Trie()
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
      const trie = new Trie()
      const node = trie.define('/a/:b(^(x|y|z)$)')
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

      const child = trie.define('/a/:b(^(x|y|z)$)/c')
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
      const handler = () => {}
      const trie = new Trie()

      assert.throws(() => trie.define('/').handle('GET', null))
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
}
