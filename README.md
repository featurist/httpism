# HTTPism

[![travis-ci](https://secure.travis-ci.org/featurist/httpism.png?branch=master)](https://travis-ci.org/featurist/httpism)

httpism is a HTTP client that does a few things differently:

* **middleware**: customise a HTTP client for your API by sticking together middleware, for example, for content handlers or authentication schemes.
* **hypermedia**: responses can be used to make further requests relative to the response URI, just like a browser.
* **useful by default**: sends and receives JSON, throws exceptions on 400-500s, follows redirects. Of course, all this stuff can be disabled for serious HTTPsters, exposing raw HTTP and streams.
* **promises**: no messing about with callbacks.

## NPM

    npm install httpism

Then

    var httpism = require('httpism');

## GET JSON

    httpism.get('http://example.com/').then(function (response) {
      console.log('json', response.body);
    }, function (error) {
      console.log('uh oh', error);
    });

## POST JSON

    httpism.post('http://example.com/', {name: 'Betty Boo'}).then(function (response) {
      console.log('json', response.body);
    }, function (error) {
      console.log('uh oh', error);
    });

## Create an API

Specify a base URL:

    var example = httpism.api('http://example.com/');

    // GET http://example.com/a
    example.get('a').then(function (response) {
      console.log(response.body);
    });

Specify some options:

    var loggingHttpism = httpism.api({log: true});

    loggingHttpism.get('http://example.com/').then(function (response) {
      console.log(response.body);
    });

Add some middleware:

    var authHttpism = httpism.api(function (request, next) {
      request.url += '?apikey=myapikey';
      return next();
    });

    // GET https://secretapi.com/?apikey=myapikey
    authHttpism.get('https://secretapi.com/').then(function (response) {
      console.log(response.body);
    });

Or do all three at once.

    var api = httpism.api(
      "http://url/",
      { option: 'value' },
      function middleware() { ... }
    );

`middleware` can be a function or an array of functions. See below.

## Middleware

Middleware commonly works like this:

    function middleware(request, next, httpism) {
      // change request
      request.url = ...;
      return next().then(function (response) {
        // change response
        response.body = ...;
        return response;
      });
    }

* `request` is an object with the following properties:
    * `url` the full URL of the request, e.g. `http://example.com/path?query=value`
    * `method` the method of the request, e.g. `GET` or `POST`
    * `headers` the headers of the request as an object. All headers are lower-cased as per Node.js conventions. E.g. `{ 'content-type': 'application/json' }`
    * `options` the options as passed through from the request, either from the **api** or the individual request. E.g. `{log: true}`.
    * `body` the body of the request. Will be `undefined` for `get()` etc, otherwise will be the object specified as the second argument to methods like `post()`.
* `next` is a function that passes control onto the next middleware, it returns a promise of the response.
* `httpism` is a **httpism** object, for which you can make further requests inside the middleware. For example, the redirect middleware uses this.

## Hypermedia

All responses are full `httpism` clients, just with their base URI set to the HREF of the response.

    httpism.get('http://example.com/api/').then(function (api) {
      // api.body is:
      // {
      //   "documentsLink": "documents"
      // }

      // so we navigate to http://example.com/api/docuemnts
      api.get(api.body.documentsLink).then(function (documents) {
        console.log('documents', documents.body);
      });
    });

## Responses

Responses are objects that contain

* `url` the full URL of the response
* `headers` the headers of the response
* `body` the body of the response. Depending on the `Content-Type` header:
    * `application/json` a javascript object
    * `text/*` or `application/javascript` a javascript string
    * anything else is returned as a Node stream, **be careful to close it!**

## Options

* `log` default `undefined`, set to `true` if you want to log both requests and responses, or `'request'` to log requests, or `'response'` to log responses.
* `exceptions` default `true`, throw exceptions on reception of 400-500 status codes. Set to `false` to simply return the response.
* `redirect` default `true`, follow redirects for 300, 301, 302, 303 and 307 status codes with `Location` response headers. Set to `false` to simply return the redirect response.
* `headers` default `undefined`, can be set to an object that is merged with middleware headers.
* `http` default `undefined`, object containing options that are passed to [Node.js http.request()](http://nodejs.org/api/http.html#http_http_request_options_callback).
    Many of these options are ignored by default, so you should set `agent: undefined` to force a new agent to honour the options.
* `https` default `undefined`, object containing options that are passed to [Node.js https.request()](http://nodejs.org/api/https.html#https_https_request_options_callback).
    Many of these options are ignored by default, so you should set `agent: undefined` to force a new agent to honour the options.

### License

BSD
