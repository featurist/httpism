# HTTPism

[![travis-ci](https://secure.travis-ci.org/featurist/httpism.png?branch=master)](https://travis-ci.org/featurist/httpism)

httpism is a HTTP client that does a few things differently:

* **middleware**: customise a HTTP client for your API by sticking together middleware, for example, for content handlers or authentication schemes.
* **hypermedia**: responses can be used to make further requests relative to the response URI, just like a browser.
* **useful by default**: sends and receives JSON, throws exceptions on 400-500s, follows redirects. Of course, you can disable this stuff when it gets in your way, or hit raw HTTP and streams when you need to get clever.
* **promises**: no messing about with callbacks.

## NPM: [httpism](https://www.npmjs.org/package/httpism)

```sh
npm install httpism
```

Then

```JavaScript
var httpism = require('httpism');
```

## GET JSON

```JavaScript
httpism.get('http://example.com/').then(function (response) {
  console.log('json', response.body);
}, function (error) {
  console.log('uh oh', error);
});
```

## POST JSON

```JavaScript
httpism.post('http://example.com/', {name: 'Betty Boo'}).then(function (response) {
  console.log('json', response.body);
}, function (error) {
  console.log('uh oh', error);
});
```

## Create an API

Specify a base URL:

```JavaScript
var example = httpism.api('http://example.com/');

// GET http://example.com/a
example.get('a').then(function (response) {
  console.log(response.body);
});
```

Specify some options:

```JavaScript
var loggingHttpism = httpism.api({exceptions: false});

loggingHttpism.get('http://example.com/').then(function (response) {
  console.log(response.body);
});
```

Add some middleware:

```JavaScript
var authHttpism = httpism.api(function (request, next) {
  request.url += '?apikey=myapikey';
  return next();
});

// GET https://secretapi.com/?apikey=myapikey
authHttpism.get('https://secretapi.com/').then(function (response) {
  console.log(response.body);
});
```

See more about [apis](#apis).

## Logging

httpism uses [debug](https://github.com/visionmedia/debug) so you can enable logging just by setting the `DEBUG` environment variable to `httpism:*`:

```bash
DEBUG=httpism:* node app.js
```

More information in debug's README.

## Requests

### GET, HEAD, DELETE

```JavaScript
httpism.method (url, [options])
response.method (url, [options])
```

* `url` a string url, full or relative to the response, or '' to request the response again
* `options` request options, see [options](#options).
* `response` a response from another request.

returns a promise

### POST, PUT, PATCH, OPTIONS

```JavaScript
httpism.method (url, data, [options])
response.method (url, data, [options])
```

* `url` a string url, full or relative to the response, or '' to request the response again
* `data` the data to send
    * by default a JS object is encoded as JSON and sent as `application/json`
    * a JS object with options `{form: true}` is url-encoded and sent as `application/x-www-form-urlencoded`
    * a stream (where `typeof(stream.pipe) === 'function'`) is sent as is. Be sure to set `Content-Type` header: `{headers: {'content-type': '...'}}`.
* `options` request options, see [options](#options).
* `response` a response from another request.

## Responses

Responses are objects that contain

* `url` the full URL of the response
* `headers` the headers of the response
* `body` the body of the response. Depending on the `Content-Type` header:
    * `application/json` a object
    * `application/x-www-form-urlencoded` a object
    * `text/*` or `application/javascript` a string
    * anything else is returned as a Node stream, **be careful to close it!**

## Hypermedia

All responses are full `httpism` clients, just with their base URI set to the HREF of the response. They respond to all the HTTP methods, as well as `api()`, see [apis](#apis) below.

```JavaScript
httpism.get('http://example.com/api/').then(function (api) {
  // api.body is:
  // {
  //   "documentsLink": "documents"
  // }

  // so we navigate to http://example.com/api/documents
  api.get(api.body.documentsLink).then(function (documents) {
    console.log('documents', documents.body);
  });
});
```

## Options

* `exceptions`: default `true`, throw exceptions on reception of 400-500 status codes. Set to `false` to simply return the response.
* `redirect`: default `true`, follow redirects for 300, 301, 302, 303 and 307 status codes with `Location` response headers. Set to `false` to simply return the redirect response.
* `headers`: default `undefined`, can be set to an object that is merged with middleware headers.
* `basicAuth`: use Basic Authentication, pass an object `{ username: 'bob', password: "bob's secret" }`.
* `querystring`: default `undefined`, can be set to an object containing fields that are URL-encoded and merged with the querystring already on the URL, if any.
* `responseBody`: can be used to force the parsing of the response, ignoring the `Content-Type`, it can be a string of one of the following:
    * `'stream'`: always downloads the response as a stream
    * `'json'`: always parses the response as a JSON object
    * `'text'`: always parses the response as text
    * `'form'`: always parses the response as a URL-encoded form
    * `undefined`: parse response based on `Content-Type`, the default.
* `http`: default `undefined`, object containing options that are passed to [Node.js http.request()](http://nodejs.org/api/http.html#http_http_request_options_callback).
    Many of these options are ignored by default, so you should set `agent: undefined` to force a new agent to honour the options.
* `https`: default `undefined`, object containing options that are passed to [Node.js https.request()](http://nodejs.org/api/https.html#https_https_request_options_callback).
    Many of these options are ignored by default, so you should set `agent: undefined` to force a new agent to honour the options.

## APIs

API clients give you a way to build or customise a HTTP client for the purpose of accessing a particular web API. Web APIs will often have special authorization, headers, or URL conventions that are common across all calls, and you only want to have to specify those things once.

You can create API clients, either from `httpism`, giving you a fairly complete HTTP client, or from `httpism.raw` giving you no frills streaming HTTP client to do what you will with. 

```JavaScript
var api = httpism.api([url], [options], [middleware]);
var api = httpism.raw.api([url], [options], [middleware]);
var api = response.api([url], [options], [middleware]);
```

* `url` a URL string, which could be relative to the response, or absolute.
* `options` options object to be used for all calls with this api. If `api` is called on a response, the options are merged with that responses api.
* `middleware` a middleware function or array of middleware functions. Requests in middleware are processed from the beginning of the array to the end, and responses from the end of the array to the beginning. See [middleware](#middleware). Middleware specified on the new api is _prepended_ to the middleware currently in the api.

* `httpism` is the basic client, with all the goodies described above.
* `httpism.raw` is a raw client that has no other middleware.
* `response` is a response from another request.

## Middleware

Middleware commonly works like this:

```JavaScript
function middleware(request, next, httpism) {
  // change request
  request.url = ...;
  return next().then(function (response) {
    // change response
    response.body = ...;
    return response;
  });
}
```

* `request` is an object with the following properties:
    * `url` the full URL of the request, e.g. `http://example.com/path?query=value`
    * `method` the method of the request, e.g. `GET` or `POST`
    * `headers` the headers of the request as an object. All headers are lower-cased as per Node.js conventions. E.g. `{ 'content-type': 'application/json' }`
    * `options` the [options](#options) as passed through from the request, either from the **api** or the individual request. E.g. `{exceptions: true}`.
    * `body` the body of the request. Will be `undefined` for `get()` etc, otherwise will be the object specified as the second argument to methods like `post()`.
* `next` is a function that passes control onto the next middleware, it returns a promise of the [response](#responses).
* `httpism` is a **httpism api** object, for which you can make further requests inside the middleware. For example, the redirect middleware uses this.

### Existing Middleware

The following middleware are available in `var middleware = require('httpism/middleware')`:

* `middleware.json` sends and receives JSON objects as `application/json`, also sets `Accept: application/json` on request.
* `middleware.text` sends strings as `text/plain` and receives strings when `text/*` or `application/javascript`.
* `middleware.exception` throws an exception when the response status code is 400-500.
* `middleware.logger` logs requests and responses.
* `middleware.redirect` follows redirects.
* `middleware.headers` honours `options.headers`.
* `middleware.form` when `options.form == true` sends and receives URL-encoded JS objects `application/x-www-form-urlencoded`.
* `middleware.querystring` merges the URL-encoded `options.querystring` into the request URL.

See [middleware.pogo](https://github.com/featurist/httpism/blob/master/middleware.pogo) for more info.

# License

BSD
