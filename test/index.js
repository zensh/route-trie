'use strict';
/*global describe, it, before, after, beforeEach, afterEach*/

var assert = require('assert');
var Trie = require('../index.js');

describe('route-trie', function () {
  it('trie.define', function () {
    var trie = new Trie();

    assert.throws(function () {
      trie.define(1);
    }, Error);

    var node = trie.define('/');
    assert.strictEqual(node, trie.define(''));
    assert.strictEqual(node, trie.define('///'));

    node = trie.define('/path1/path2');
    assert.strictEqual(node, trie.define('path1/path2'));
    assert.strictEqual(node, trie.define('//path1/path2'));
    assert.strictEqual(node, trie.define('/path1///path2'));
    assert.strictEqual(node, trie.define('/path1/path2/'));
    assert.strictEqual(node, trie.define('/path1/path2()/'));

    assert.notStrictEqual(node, trie.define('/path1/path2/path3'));
    assert.notStrictEqual(node, trie.define('/path1/:path2'));
    assert.notStrictEqual(node, trie.define('/path2/path2'));

    node = trie.define('/path1/:path2/path3');
    assert.strictEqual(node, trie.define('/path1/:path22/path3'));
    assert.notStrictEqual(node, trie.define('/path1/:path22(a|b)/path3'));

    assert.notStrictEqual(trie.define('/Post'), trie.define('/post'));
  });

  it('trie.match', function () {
    var trie = new Trie();

    var node = trie.define('/');
    var match = trie.match('/');
    assert.strictEqual(node, match.node);
    assert.deepEqual(match.params, {});
    assert.strictEqual(match.node, trie.match('').node);
    assert.strictEqual(null, trie.match('/path'));
    assert.strictEqual(null, trie.match('path'));

    trie = new Trie();
    node = trie.define('/:type');
    match = trie.match('/post');
    assert.deepEqual(match.params, {type: 'post'});
    assert.strictEqual(node, match.node);
    assert.strictEqual(node, trie.match('/task').node);

    trie = new Trie();
    node = trie.define('/:type/:id([1-9a-z]{6})');
    match = trie.match('/post/a12345');
    assert.deepEqual(match.params, {type: 'post', id: 'a12345'});
    assert.strictEqual(node, match.node);
    assert.strictEqual(node, trie.match('/task/aaabbb').node);
    assert.strictEqual(null, trie.match('/task/aaabbbc'));
    assert.strictEqual(null, trie.match('/task/aaabbb/ccc'));
    assert.strictEqual(null, trie.match('/task/aaabb'));
    assert.strictEqual(null, trie.match('/task'));

    trie = new Trie();
    node = trie.define('/post|task/([1-9a-z]{6})');
    assert.strictEqual(trie.define('/(post|task)/([1-9a-z]{6})'), node);
    assert.strictEqual(trie.define('/post|task/[1-9a-z]{6}'), node);
    assert.deepEqual(trie.match('/post/a12345').params, {});
    assert.strictEqual(trie.match('/post/a12345').node, node);
    assert.deepEqual(trie.match('/task/a12345').params, {});
    assert.strictEqual(trie.match('/task/a12345').node, node);
    assert.strictEqual(trie.match('/event/a12345'), null);
    assert.strictEqual(trie.match('/task/a123456'), null);
    assert.strictEqual(trie.match('/task/a12345/6'), null);
    assert.strictEqual(trie.match('/post'), null);
    assert.strictEqual(trie.match('/'), null);

    trie = new Trie();
    node = trie.define('/:type(post|task)/:id([1-9a-z]{6})');
    assert.strictEqual(trie.define('/:type1(post|task)/[1-9a-z]{6}'), node);
    assert.deepEqual(trie.match('/post/a12345').params, {type: 'post', id: 'a12345'});
    assert.strictEqual(trie.match('/post/a12345').node, node);
    assert.deepEqual(trie.match('/task/a12345').params, {type: 'task', id: 'a12345'});
    assert.strictEqual(trie.match('/task/a12345').node, node);

    trie = new Trie();
    var node1 = trie.define('/:type');
    var node2 = trie.define('/:type/:id');
    assert.deepEqual(trie.match('/post').params, {type: 'post'});
    assert.strictEqual(trie.match('/post').node, node1);
    assert.deepEqual(trie.match('/task').params, {type: 'task'});
    assert.strictEqual(trie.match('/task').node, node1);
    assert.deepEqual(trie.match('/post/123456').params, {type: 'post', id: '123456'});
    assert.strictEqual(trie.match('/post/123456').node, node2);
    assert.deepEqual(trie.match('/task/123456').params, {type: 'task', id: '123456'});
    assert.strictEqual(trie.match('/task/123456').node, node2);

    trie = new Trie();
    node1 = trie.define('/:user(user|admin)/:id([1-9]{6})');
    node2 = trie.define('/:type(post|task)/:id([a-z]{6})');
    assert.deepEqual(trie.match('/post/aaaaaa').params, {type: 'post', id: 'aaaaaa'});
    assert.strictEqual(trie.match('/post/aaaaaa').node, node2);
    assert.deepEqual(trie.match('/task/aaaaaa').params, {type: 'task', id: 'aaaaaa'});
    assert.strictEqual(trie.match('/task/aaaaaa').node, node2);
    assert.strictEqual(trie.match('/task/111111'), null);
    assert.deepEqual(trie.match('/admin/123456').params, {user: 'admin', id: '123456'});
    assert.strictEqual(trie.match('/admin/123456').node, node1);
    assert.deepEqual(trie.match('/user/123456').params, {user: 'user', id: '123456'});
    assert.strictEqual(trie.match('/user/123456').node, node1);
    assert.strictEqual(trie.match('/user/aaaaaa'), null);

    trie = new Trie();
    trie.define('/post/:id([a-z]+)');
    assert.deepEqual(trie.match('/post/abc').params, {id: 'abc'});
    assert.strictEqual(trie.match('/post/ABC'), null);
    assert.strictEqual(trie.match('/Post/abc'), null);

    trie = new Trie(true);
    trie.define('/post/:id([a-z]+)');
    assert.deepEqual(trie.match('/post/abc').params, {id: 'abc'});
    assert.deepEqual(trie.match('/post/ABC').params, {id: 'ABC'});
    assert.deepEqual(trie.match('/Post/abc').params, {id: 'abc'});

  });
});
