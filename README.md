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

Implementations:

- [toa-router](https://github.com/toajs/toa-router) A trie router for toa(server).
- [hirouter](https://github.com/teambition/hirouter) HTML5 history and router, simple, powerful and no framework(browser).
- [RotorJS](https://github.com/kuraga/rotorjs) Component-based JavaScript library for single-page applications and an example application.

### Browser Support

IE9+

## Demo

## Installation

```sh
npm install route-trie
```

## API

```js
const Trie = require('route-trie')
```

### Class: Trie(options)

Create a trie instance.

- `options.ignoreCase`: {Boolean}, default to `true`, ignore case.
- `options.fixedPathRedirect`: {Boolean}, default to `true`. If enabled, the trie will detect if the current path can't be matched but a handler for the fixed path exists. matched.fpr will returns either a fixed redirect path or an empty string. For example when "/api/foo" defined and matching "/api//foo", The result matched.fpr is "/api/foo".
- `options.trailingSlashRedirect`: {Boolean}, default to `true`. If enabled, the trie will detect if the current path can't be matched but a handler for the path with (without) the trailing slash exists. matched.tsr will returns either a redirect path or an empty string. For example if /foo/ is requested but a route only exists for /foo, the client is redirected to /foo. For example when "/api/foo" defined and matching "/api/foo/", The result matched.tsr is "/api/foo".

```js
let trie1 = new Trie()
let trie2 = new Trie({
  ignoreCase: false,
  fixedPathRedirect: false,
  trailingSlashRedirect: false
})
```

### Class Method: Trie.prototype.define(pattern)

Returns a Node instance for the `pattern`, The same pattern will always return the same node.

## Pattern Rule

The defined pattern can contain three types of parameters:

| Syntax | Description |
|--------|------|
| `:name` | named parameter |
| `:name*` | named with catch-all parameter |
| `:name(regexp)` | named with regexp parameter |
| `::name` | not named parameter, it is literal `:name` |

Named parameters are dynamic path segments. They match anything until the next '/' or the path end:

Defined: `/api/:type/:ID`
```
/api/user/123             matched: type="user", ID="123"
/api/user                 no match
/api/user/123/comments    no match
```

Named with catch-all parameters match anything until the path end, including the directory index (the '/' before the catch-all). Since they match anything until the end, catch-all parameters must always be the final path element.

Defined: `/files/:filepath*`
```
/files                           no match
/files/LICENSE                   matched: filepath="LICENSE"
/files/templates/article.html    matched: filepath="templates/article.html"
```

Named with regexp parameters match anything using regexp until the next '/' or the path end:

Defined: `/api/:type/:ID(^\\d+$)`
```
/api/user/123             matched: type="user", ID="123"
/api/user                 no match
/api/user/abc             no match
/api/user/123/comments    no match
```

The value of parameters is saved on the `matched.params`. Retrieve the value of a parameter by name:
```
let type = matched.params.type
let id   = matched.Params.ID
```

**Notice for regex pattern:**

As mentioned above, you may use regular expressions defining node:

```js
var node = trie.define('/abc/:name([0-9]{2})')
assert(trie.match('/abc/47').node === node)
```

But due to [JavaScript String Escape Notation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String): `'\d' === 'd'`, `trie.define('/abc/:name(\d{2})') === trie.define('/abc/:name(d{2})')`.
`trie.define` accept a string literal, not a regex literal, the `\` maybe be escaped!

```js
var node = trie.define('/abc/:name(\d{2})')
trie.match('/abc/47')  // null
assert(trie.match('/abc/dd').node === node)
```

The same for `\w`, `\S`, etc.

To use backslash (`\`) in regular expression you have to escape it manually:

```js
var node = trie.define('/abc/:name(\\w{2})')
assert(trie.match('/abc/ab').node === node)
```

### Class Method: Trie.prototype.match(path)

- `path`: {String}, URL pathname to match and get the defined `node`

Return `matched` object:
  - `node`: {Object}, The matched node or `null`.
  - `params`: {Object}, A list of named parameters, ex, `match.params.id === 'abc123'`, or a empty object.
  - `fpr`: {String}, if fixedPathRedirect enabled, it may returns a redirect path, otherwise a empty string.
  - `tsr`: {String}, if trailingSlashRedirect enabled, it may returns a redirect path, otherwise a empty string.

  ```js
  var node = trie.define('/:type/:id([a-z0-9]{6}')
  var match = trie.match('/post')
  // assert(match === null)

  match = trie.match('/post/abc123')
  // assert(match.node === node)
  // assert.deepEqual(match.params, {type: 'post', id: 'abc123'})
  ```

### Class: Node

It is created by `trie.define`.

### Class Method: Node.prototype.handle(method, handler)

Mount handler with a method to the node.
```js
let trie = new Trie()
trie.define('/').handle('GET', handler)
trie.define('/').handle('PUT', handler)
trie.define('/api').handle('GET', handler)
```

### Class Method: Node.prototype.getHandler(method)

Get the handler by method from the node.
```js
let handler = trie.match('/api').node.getHandler('GET')
```

### Class Method: Node.prototype.getAllow()

Get the "allow" header on the node.
```js
console.log(trie.match('/').node.getAllow()) // 'GET, PUT'
```

[npm-url]: https://npmjs.org/package/route-trie
[npm-image]: http://img.shields.io/npm/v/route-trie.svg

[travis-url]: https://travis-ci.org/zensh/route-trie
[travis-image]: http://img.shields.io/travis/zensh/route-trie.svg

[downloads-url]: https://npmjs.org/package/route-trie
[downloads-image]: http://img.shields.io/npm/dm/route-trie.svg?style=flat-square
