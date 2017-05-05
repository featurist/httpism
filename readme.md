# httpism [![npm version](https://img.shields.io/npm/v/httpism.svg)](https://www.npmjs.com/package/httpism) [![npm](https://img.shields.io/npm/dm/httpism.svg)](https://www.npmjs.com/package/httpism) [![Build Status](https://travis-ci.org/featurist/httpism.svg?branch=master)](https://travis-ci.org/featurist/httpism)

httpism is a node and browser HTTP client that does a few things differently:

* **middleware**: customise a HTTP client for your API by sticking together middleware, for example, for content handlers or authentication schemes.
* **useful by default**: sends and receives JSON, throws exceptions on 400-500s, follows redirects. Of course, you can disable this stuff when it gets in your way, or hit raw HTTP and streams when you need to get clever.
* **promises**: no messing about with callbacks.
* for **browser** and **server** alike.

In addition, httpism supports:

* URL templates
* Cookies
* HTTP proxies for HTTP and HTTPS traffic, with proxy authentication
* Basic authentication
* JSON
* URL encoded forms
* streams
* CORS
* JSONP

## Upgrading from 2.x

Httpism 3.x returns the body of the response by default, not the response. This is what you want 95% of the time, however, if you're upgrading from 2.x, or you want the response with headers, status code, etc, then you can do this:

```js
var httpism = require('httpism').client({response: true})
```

## NPM: [httpism](https://www.npmjs.org/package/httpism)

```sh
npm install httpism
```

Then

```js
var httpism = require('httpism');
```

Compatible with browserify and webpack too!

## Browser Size

* httpism.js: 23K
* httpism.min.js: 10K
* httpism.min.js.gz: 3.7K

## GET JSON

```js
httpism.get('http://example.com/').then(function (responseBody) {
  console.log('json', responseBody);
}, function (error) {
  console.log('uh oh', error);
});
```

## POST JSON

```js
httpism.post('http://example.com/', {name: 'Betty Boop'}).then(function (responseBody) {
  console.log('json', responseBody);
}, function (error) {
  console.log('uh oh', error);
});
```

## POST www-form-urlencoded

```js
httpism.post('http://example.com/', { name: "Betty Boop" }, { form: true }).then(function (responseBody) {
  console.log('json', responseBody);
}, function (error) {
  console.log('uh oh', error);
});
```

## POST streams and files

Pass a stream as the second argument, it will try to guess the `Content-Type` from the filename if possible, but you can override it if you know better.

```js
var stream = fs.createReadStream('afile.txt');

httpism.post('http://example.com/', stream).then(function (responseBody) {
  console.log('json', responseBody);
}, function (error) {
  console.log('uh oh', error);
});
```

## POST multipart forms

Httpism works with [form-data](https://github.com/form-data/form-data), all you need to do is pass a `FormData` instance as the body:

```js
var form = new FormData();

form.append('name', 'Betty Boop');
form.append('address', 'New York');
form.append('photo', fs.createReadStream('betty.jpg'));

httpism.post('http://example.com/', form).then(function (responseBody) {
  console.log('json', responseBody);
}, function (error) {
  console.log('uh oh', error);
});
```

## Create an API client

Specify a base URL:

```js
var example = httpism.client('http://example.com/');

// GET http://example.com/a
example.get('a').then(function (responseBody) {
  console.log(responseBody);
});
```

Specify some options:

```js
var loggingHttpism = httpism.client({exceptions: false});

loggingHttpism.get('http://example.com/').then(function (responseBody) {
  console.log(responseBody);
});
```

Add some middleware:

```js
var authHttpism = httpism.client(function (request, next) {
  request.url += '?apikey=myapikey';
  return next();
});

// GET https://secretapi.com/?apikey=myapikey
authHttpism.get('https://secretapi.com/').then(function (responseBody) {
  console.log(responseBody);
});
```

See more about [clients](#clients).

## In the Browser

The browser version has a few differences from the node version:

* Relative URLs are relative to the current browser location.
* No support for streams.
* Redirects aren't optional, browsers _always_ follow redirects.
* Logging is removed, since most (if not all?) browsers now have a network debug tab.

However, everything else works as described here.

## Debug

httpism uses [debug](https://github.com/visionmedia/debug) so you can enable logging just by setting the `DEBUG` environment variable to `httpism:*`:

```bash
DEBUG=httpism* node app.js
```

* `httpism` simple request => response, i.e. `GET http://www.example.com/api => 200 (40ms)`
* `httpism:request` the request
* `httpism:response` the response

More information in debug's README.

## Proxy Environment Variables

Httpism obeys the following environments variables:

  * `http_proxy` `HTTP_PROXY` - for HTTP requests
  * `https_proxy` `HTTPS_PROXY` - for HTTPS requests
  * `all_proxy` `ALL_PROXY` - for HTTP or HTTPS requests
  * `no_proxy` `NO_PROXY` - an comma separated list of hostnames (and optional ports) to not proxy

For more details please see [proxy-from-env](https://github.com/Rob--W/proxy-from-env).

## Requests

### GET, HEAD, DELETE

```js
httpism.method(url, [options])
```

* `url` a string URL, this is a URL template if the `params` option is used, see [params](#params).
* `options` request options, see [options](#options).

returns a promise

### POST, PUT, PATCH, OPTIONS

```js
httpism.method(url, body, [options])
```

* `url` a string URL, this is a URL template if the `params` option is used, see [params](#params).
* `body` the request body to send
    * by default a JS object is encoded as JSON and sent as `application/json`
    * a JS object with options `{form: true}` is url-encoded and sent as `application/x-www-form-urlencoded`
    * a stream. It will try to guess the `Content-Type` from a file stream, but if not, pass `{headers: {'content-type': ...}}` as options.
* `options` request options, see [options](#options).

### Params

Httpism will render a URL template if the `params` option is used, the params are interpolated into the URL template, any params left over will form the query string.

```js
httpism.get('http://example.com/users/:user/posts', {
  params: {
    user: 'bob',
    page: 3,
    search: 'lakes'
  }
})
```

Will become

```
GET http://example.com/users/bob/posts?page=3&search=lakes
```

A template contains two forms of parameter, varying on the way special characters are encoded for URLs.

* `:param` - uses `encodeURIComponent`, and is useful for most applications
* `:param*` - uses `encodeURI` and can be used to interpolate paths, such as `a/path/to/something` without encoding the slash characters.

Any remaining parameters will be encoded in the query string, you can override how the query string is encoded using the `qs` option.

The template interpolation itself can be overridden with the `expandUrl` option, and is used as follows:

```js
var url = expandUrl(template, params, querystring)
```

* `template` - the URL template, passed in as the `url` argument to `httpism.get`, etc.
* `params` - the object containing the parameters to be interpolated.
* `querystring` - the `qs` option, can be used to encode the query string parameters, e.g. `querystring.stringify(params)`.

For example, you could use RFC 6570 templates like this

```js
var urlTemplate = require('url-template')

function expandUrl(url, params) {
  var template = urlTemplate.parse(url)
  return template.expand(params)
}

httpism.get('http://example.com/users/{user}/posts{?page,search}', {
  params: {
    user: 'bob',
    page: 3,
    search: 'lakes'
  },
  expandUrl: expandUrl
})
```

Or indeed create a new client to use this by default:

```js
var httpism = require('httpsim').client({
  expandUrl: expandUrl
})

httpism.get('http://example.com/users/{user}/posts{?page,search}')
```

### Request

```js
httpism.request(method, url, [body], [options])
```

* `url` a string url, full or relative to the response, or '' to request the response again
* `body` the request body to send
    * by default a JS object is encoded as JSON and sent as `application/json`
    * a JS object with options `{form: true}` is url-encoded and sent as `application/x-www-form-urlencoded`
    * a stream. It will try to guess the `Content-Type` from a file stream, but if not, pass `{headers: {'content-type': ...}}` as options.
* `options` request options, see [options](#options).


## Responses

Responses bodies are returned by all methods by default. To access other details about responses, pass `{ response: true }` in the request options to receive a response object that contains:

* `statusCode` the status code as an integer, such as `200`, or `404`.
* `statusText` the status text, such as `OK` or `Not Found`.
* `url` the full URL of the response. In the browser, this will be root-relative if the request is for the same domain as the current page. This can be different to the `request.url` if there was a redirect.
* `headers` the headers of the response
* `body` the body of the response. Depending on the `Content-Type` header:
    * `application/json` a object
    * `application/x-www-form-urlencoded` a object
    * `text/*` or `application/javascript` a string
    * on the server, anything else is returned as a Node stream, **be careful to close it!**. In the browser, anything else is returned as a string.

## Cookies

Cookies on the server are not handled by default, but you can enable them by using `httpism.client` passing the `{cookies: true}` option:

```js
var client = httpism.client({cookies: true});

var creds = {
  username: 'jerome',
  password: 'password123'
}

client.post('http://example.com/login', creds, {form: true}).then(function () {
  return client.get('/profile').then(function (profile) {
    console.log(profile)
  })
})
```

Different httpism clients will use different cookie jars. Cookies are always on in the browser, using native browser cookies.

## Cancel a request

Requests can be cancelled by calling `.abort()` on the promise returned from any request method:

```js
var promise = httpism.get('/something');
promise.abort();
```

## Options

* `response`: default `false`, if true, returns the whole response, including URL, headers, status code and the body, otherwise return just the body.
* `exceptions`: default `true`, throw exceptions on reception of 400-500 status codes. Set to `false` to simply return the response. If set to a function, the function is passed the response, and returns true to throw the response as an exception, or false to treat it as a normal response.
* `redirect`: default `true`, follow redirects for 300, 301, 302, 303 and 307 status codes with `Location` response headers. Set to `false` to simply return the redirect response.
* `headers`: default `undefined`, can be set to an object that is merged with middleware headers.
* `basicAuth`: use Basic Authentication, pass an object `{ username: 'bob', password: "bob's secret" }`.
* `cookies`: default `false`, use cookies.
* `querystring`: default `undefined`, can be set to an object containing fields that are URL-encoded and merged with the querystring already on the URL, if any. This is parsed and stringified using `options.qs.parse` and `options.qs.stringify` if provided, or using a very lite internal query string parser.
* `qs`: optional override for parsing and stringifying querystrings, you can pass node's `querystring` or `qs`. Any object that contains the methods `parse` and `stringify` can be used. If not provided, httpism will use an internal (and very small) query string parser/stringifier.
* `form`: when `true`, treats the incoming JSON data as a form and encodes it as `application/x-www-form-urlencoded`.
* `responseBody`: can be used to force the parsing of the response, ignoring the `Content-Type`, it can be a string of one of the following:
    * `'stream'`: always downloads the response as a stream
    * `'json'`: always parses the response as a JSON object
    * `'text'`: always parses the response as text
    * `'form'`: always parses the response as a URL-encoded form
    * `undefined`: parse response based on `Content-Type`, the default.
* `proxy`: a proxy URL, if present all requests will be run through the proxy. This works if either of the environment variables `http_proxy` or `HTTP_PROXY` are set too.
* `http`: default `undefined`, object containing options that are passed to [Node.js http.request()](http://nodejs.org/api/http.html#http_http_request_options_callback).
    Many of these options are ignored by default, so you should set `agent: undefined` to force a new agent to honour the options.
* `https`: default `undefined`, object containing options that are passed to [Node.js https.request()](http://nodejs.org/api/https.html#https_https_request_options_callback).
    Many of these options are ignored by default, so you should set `agent: undefined` to force a new agent to honour the options.
* `jsonp`: to perform a JSONP request, set this to the name of the parameter to contain the callback function, often this is simply `callback`.
* `xhr`: can be used to override `window.XMLHttpRequest` used to make the request, useful for mocking out requests during testing. It is expected to be used as a constructor, as in `new options.xhr()`.
* `jsonReviver`: a [reviver function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse) that is passed to `JSON.parse(string, [reviver])` to override how JSON response bodies are decoded.
* `timeout`: the request timeout in milliseconds.
* `output`: should be a stream, the response body will be written to the stream and httpism will wait until it's fully written.

## Clients

Clients give you a way to build or customise a HTTP client for the purpose of accessing a particular web API. Web APIs will often have special authorization, headers, or URL conventions that are common across all calls, and you only want to have to specify those things once.

You can create API clients, either from `httpism`, giving you a fairly complete HTTP client, or from `httpism.raw` giving you no frills streaming HTTP client to do what you will with.

```js
var client = httpism.client([url], [options], [middleware]);
var client = httpism.raw.client([url], [options], [middleware]);
var anotherClient = client.client([url], [options], [middleware]);
```

* `url` a URL string, which could be relative to the response, or absolute.
* `options` options object to be used for all calls with this client. If `client` is called on a response, the options are merged with that responses client.
* `middleware` a middleware function or array of middleware functions. Requests in middleware are processed from the beginning of the array to the end, and responses from the end of the array to the beginning. See [middleware](#middleware). Middleware specified on the new client is _prepended_ to the middleware currently in the client.

* `httpism` is the basic client, with all the goodies described above.
* `httpism.raw` is a raw client that has only the base transport, `http` or `https` on node, and `xhr` in the browser.

## Middleware

Middleware commonly works like this:

```js
function middleware(request, next, client) {
  // change request
  request.url = ...;
  return next().then(function (response) {
    // change response
    response.body = ...;
    return response;
  });
}
```

Middleware are ordered, and each one can have a name, and a preference to be placed before or after other named middleware. You can place the middleware `before` any of the middleware in an array, or `after` any of the middleware in an array.

```js
middleware.httpismMiddleware = {
  name: 'name',
  before: ['http', 'debugLog'],
  after: 'redirect'
}
```

You can insert the middleware by passing it to `httpism.client()`, or by calling `client.use()`:

```js
// create a new client with middleware
var client = httpism.client(middleware);

// add middleware to an existing client
client.use(middleware);

// add middleware globally and to all new clients
httpism.use(middleware);
```

* `request` is an object with the following properties:
    * `url` the full URL of the request, e.g. `http://example.com/path?query=value`
    * `method` the method of the request, e.g. `GET` or `POST`
    * `headers` the headers of the request as an object. All headers are lower-cased as per Node.js conventions. E.g. `{ 'content-type': 'application/json' }`
    * `options` the [options](#options) as passed through from the request, either from the **client** or the individual request. E.g. `{exceptions: true}`.
    * `body` the body of the request. Will be `undefined` for `get()` etc, otherwise will be the object specified as the second argument to methods like `post()`.
* `next([request])` is a function that passes control onto the next middleware, optionally taking a request parameter. If the request parameter is not given it uses the request passed in to the middleware. It returns a promise of the [response](#responses).
* `client` is a **httpism client** object, for which you can make further requests inside the middleware with `client.request(request)`. For example, the redirect middleware uses this.
* `middleware.middleware` is the name of the middleware, which can be referred to by other middlewares when adding themselves with `before` or `after`.
* `middleware.before` ensure that the middleware is inserted just before the named middleware.
* `middleware.after` ensure that the middleware is inserted just after the named middleware.

Middleware is stored in an array `client.middleware`, you're free to manipulate this directly.

See the [middleware](middleware) directory for a full list of existing middleware.

# License

BSD
