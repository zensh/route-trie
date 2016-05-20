route-trie
====
A trie-based URL router.

[![NPM version][npm-image]][npm-url]
[![Build Status][travis-image]][travis-url]
[![Downloads][downloads-image]][downloads-url]

### About [trie](http://en.wikipedia.org/wiki/Trie)

### [Trie-based request routing](http://blog.vulcanproxy.com/trie-based-http-requests-routing/)

route-trie is a [trie](http://en.wikipedia.org/wiki/Trie)-based URL router.
Its goal is only to define and match URLs.
It does not handle methods, headers, controllers, views, etc., in anyway.
It is faster than traditional, linear, regular expression-matching routers, although insignficantly,
and scales with the number of routes.

The purpose of this router isn't for performance, but to bring more structure to URL routing.
The intention is for you to build a framework on top either in node.js or in the browser.

Implementations:

- [toa-router](https://github.com/toajs/toa-router) A trie router for toa(server).
- [hirouter](https://github.com/teambition/hirouter) HTML5 history and router, simple, powerful and no framework(browser).
- [RotorJS](https://github.com/kuraga/rotorjs) Component-based JavaScript library for single-page applications and an example application.

### Browser Support

IE9+

## Demo

## Installation

**Node.js:**

```sh
npm install route-trie
```

**Bower:**

```sh
bower install route-trie
```

## API

```js
var Trie = require('route-trie')
```

### Trie([flagI])

Create a trie.

- `flagI`: {Boolean}, default `false`, ignore case

return `trie` object.

```js
var trie1 = new Trie()
var trie2 = new Trie(true) // ignore case for match
```

### Trie.prototype.define(pattern)

Define a `node` for the `pattern`, The same pattern will always return the same `node`. The result `node`, will be an emtpy object, it has a private and not enumerable property `_nodeState`. `_nodeState` is a object that have `name`, `pattern`, `childNodes` and so on. You can mount properties and methods on the `node`, but not on `_nodeState`.

- `pattern`: {String}, each fragment of the pattern, delimited by a `/`, can have the following signature:

  - `string` - simple string.

    Define `/post` will matched:
    ```
    '/post'
    ```

  - `string|string` - `|` separated strings.

    Define `/post|task` will matched:
    ```
    '/post'
    '/task'
    ```

  - `:name` - Wildcard route matched to a name.

    Define `/:type` will matched:
    ```
    '/post', with params `{type: 'post'}`
    '/task', with params `{type: 'task'}`
    ```

  - `prefix:name` - Wildcard route matched to a name.

    Define `/api:type` will matched:
    ```
    '/apipost', with params `{type: 'post'}`
    '/apitask', with params `{type: 'task'}`
    ```

  - `(regex)` - A regular expression match without saving the parameter (not recommended). (Also see note below.)

    Define `/(post|task)`  will matched:
    ```
    '/post'
    '/task'
    ```

    Define `/([a-z0-9]{6})` will matched:
    ```
    '/abcdef'
    '/123456'
    ```

  - `:name(regex)`- Named regular expression match.

    Define `/:type/:id([a-z0-9]{6})` will matched:
    ```
    '/post/abcdef', with params `{type: 'post', id: 'abcdef'}`
    '/task/123456', with params `{type: 'task', id: '123456'}`
    ```

  - `prefix:name(regex)`- Named regular expression match. (Also see note below.)

    Define `/api:type/id:id([a-z0-9]{6})` will matched:
    ```
    '/apipost/idabcdef', with params `{type: 'post', id: 'abcdef'}`
    '/apitask/id123456', with params `{type: 'task', id: '123456'}`
    ```

  - `(*)` - Match remaining path without saving the parameter (not recommended).

    Define `/(*)` will match all path.

  - `:name(*)`- Named regular expression match, match remaining path.

    Define `/:type/:other(*)` will matched:
    ```
    '/post/abcdef', with params `{type: 'post', other: 'abcdef'}`
    '/post/abcdef/ghi', with params `{type: 'post', other: 'abcdef/ghi'}`
    '/a/b/c/d/e', with params `{type: 'a', other: 'b/c/d/e'}`
    ```

Returns a `node` object:

```js
var node = trie.define('/:type/:id([a-z0-9]{6})')
assert(node._nodeState.pattern === '/:type/:id([a-z0-9]{6})')
assert(node !== trie.define('/:type'))
assert(node !== trie.define('/post'))
assert(node === trie.define('/:type/:id([a-z0-9]{6})'))
assert(trie.define('/:type') === trie.define('/:type1'))
```

**Notice for regex pattern:**

As mentioned above, you may use regular expressions defining node:

```js
var node = trie.define('/abc/([0-9]{2})')
assert(trie.match('/abc/47').node === node)
```

But due to [JavaScript String Escape Notation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String): `'\d' === 'd'`, `trie.define('/abc/(\d{2})') === trie.define('/abc/(d{2})')`.
`trie.define` accept a string literal, not a regex literal, the `\` maybe be escaped!

```js
var node = trie.define('/abc/(\d{2})')
trie.match('/abc/47')  // null
assert(trie.match('/abc/dd').node === node)
```

The same for `\w`, `\S`, etc.

To use backslash (`\`) in regular expression you have to escape it manually:

```js
var node = trie.define('/abc/(\\w{2})')
assert(trie.match('/abc/ab').node === node)
```

### Trie.prototype.match(path[, multiMatch])

- `path`: {String}, URL pathname to match and get the defined `node`
- `multiMatch`: {Boolean}, *Optional*, default: `false`. If true, a path maybe matched one more `node`s.

Return `matched` object:

- **Default mode**: return `null` if no node matched, otherwise return an object with the following properties:

  - `params`: {Object}, A list of named parameters, ex, `match.params.id === 'abc123'`.
  - `node`: {Object}, The matched node.

  ```js
  var node = trie.define('/:type/:id([a-z0-9]{6}')
  var match = trie.match('/post')
  // assert(match === null)

  match = trie.match('/post/abc123')
  // assert(match.node === node)
  // assert.deepEqual(match.params, {type: 'post', id: 'abc123'})
  ```

- **multiMatch mode**: will always return an object with the following properties:

  - `params`: {Object}, A list of named parameters.
  - `nodes`: {Array}, if no node matched, it will be a empty array, otherwise will be a array of matched nodes.


[npm-url]: https://npmjs.org/package/route-trie
[npm-image]: http://img.shields.io/npm/v/route-trie.svg

[travis-url]: https://travis-ci.org/zensh/route-trie
[travis-image]: http://img.shields.io/travis/zensh/route-trie.svg

[downloads-url]: https://npmjs.org/package/route-trie
[downloads-image]: http://img.shields.io/npm/dm/route-trie.svg?style=flat-square
