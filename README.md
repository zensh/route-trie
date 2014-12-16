route-trie v0.1.2 [![Build Status](https://travis-ci.org/zensh/route-trie.svg)](https://travis-ci.org/zensh/route-trie)
====
A trie-based URL router.

### [trie](http://en.wikipedia.org/wiki/Trie)

### [Trie-based request routing](http://blog.vulcanproxy.com/trie-based-http-requests-routing/)

**It is a different implementation from [routington](https://github.com/pillarjs/routington)**

route-trie is a [trie](http://en.wikipedia.org/wiki/Trie)-based URL router.
Its goal is only to define and match URLs.
It does not handle methods, headers, controllers, views, etc., in anyway.
It is faster than traditional, linear, regular expression-matching routers, although insignficantly,
and scales with the number of routes.

The purpose of this router isn't for performance, but to bring more structure to URL routing.
The intention is for you to build a framework on top either in node.js or in the browser.

Implementations:

- [toa-router](https://github.com/toajs/toa-router)

### Browser Support

IE9+

## Demo

```js
```

## Installation

**Node.js:**

    npm install route-trie

**Bower:**

    bower install route-trie

## API

```js
var Trie = require('route-trie');
```

### Trie([flagI])

`flagI`: `Boolean`, default `false`, ignore case.

```js
var trie = new Trie();
```

```js
var trie = new Trie(true); // ignore case for match
```

### Trie.prototype.define(pattern)

```js
var node = trie.define('/:type/:id([a-z0-9]{6})');
// assert(node !== trie.define('/:type'));
// assert(node !== trie.define('/post'));
// assert(node === trie.define('/:type/:id([a-z0-9]{6})'));
// assert(trie.define('/:type') === trie.define('/:type1'));
```

The result `node`, will be an emtpy object, it has a private and not enumerable property `_nodeState`.

Each fragment of the pattern, delimited by a `/`, can have the following signature:

- `string` - ex `/post`
- `string|string` - `|` separated strings, ex `/post|task`
- `:name` - Wildcard route matched to a name, ex `/:type`
- `(regex)` - A regular expression match without saving the parameter (not recommended), ex `/(post|task)`, `/([a-z0-9]{6})`
- `:name(regex)`- Named regular expression match ex `/:type/:id([a-z0-9]{6})`

### Trie.prototype.match(path)

```js
var match = trie.match('/post');
// assert(match === null);

match = trie.match('/post/abc123');
// assert(match.node === trie.define('/:type/:id([a-z0-9]{6}'));
// assert.deepEqual(match.params, {type: 'post', id: 'abc123'})
```

The result `match`, unless `null`, will be an object with the following properties:

- `params` - A list of named parameters, ex, `match.params.id === 'abc123'`.
- `node` - The matched node.
