/* eslint-env mocha */

var httpism = require('../index')
var express = require('express')
var bodyParser = require('body-parser')
var chai = require('chai')
chai.use(require('chai-as-promised'))
var assert = chai.assert
var expect = chai.expect
var http = require('http')
var https = require('https')
var fs = require('fs-promise')
var qs = require('qs')
var middleware = require('../middleware')
var basicAuthConnect = require('basic-auth-connect')
var basicAuth = require('basic-auth')
var cookieParser = require('cookie-parser')
var toughCookie = require('tough-cookie')
var httpProxy = require('http-proxy')
var net = require('net')
var FormData = require('form-data')
var multiparty = require('multiparty')
var obfuscateUrlPassword = require('../obfuscateUrlPassword')
var urlTemplate = require('url-template')
var pathUtils = require('path')
var cache = require('../middleware/cache')

describe('httpism', function () {
  var server
  var app
  var port = 12345
  var baseurl = 'http://localhost:' + port

  beforeEach(function () {
    app = express()
    server = app.listen(port)
  })

  afterEach(function () {
    server.close()
  })

  describe('json', function () {
    beforeEach(function () {
      app.use(bodyParser.json())
    })

    function itCanMakeRequests (method) {
      it('can make ' + method + ' requests', function () {
        app[method.toLowerCase()]('/', function (req, res) {
          res.send({
            method: req.method,
            path: req.path,
            accept: req.headers.accept
          })
        })

        return httpism[method.toLowerCase()](baseurl).then(function (body) {
          expect(body).to.eql({
            method: method,
            path: '/',
            accept: 'application/json'
          })
        })
      })
    }

    it('can make HEAD requests', function () {
      app.head('/', function (req, res) {
        res.header('x-method', req.method)
        res.header('x-path', req.path)
        res.end()
      })

      return httpism.head(baseurl).then(function (response) {
        expect(response.headers['x-method']).to.equal('HEAD')
        expect(response.headers['x-path']).to.equal('/')
      })
    })

    function itCanMakeRequestsWithBody (method) {
      it('can make ' + method + ' requests with body', function () {
        app[method.toLowerCase()]('/', function (req, res) {
          res.send({
            method: req.method,
            path: req.path,
            accept: req.headers.accept,
            body: req.body
          })
        })

        return httpism[method.toLowerCase()](baseurl, {
          joke: 'a chicken...'
        }).then(function (body) {
          expect(body).to.eql({
            method: method,
            path: '/',
            accept: 'application/json',
            body: {
              joke: 'a chicken...'
            }
          })
        })
      })
    }

    itCanMakeRequests('GET')
    itCanMakeRequests('DELETE')
    itCanMakeRequestsWithBody('POST')
    itCanMakeRequestsWithBody('PUT')
    itCanMakeRequestsWithBody('PATCH')
    itCanMakeRequestsWithBody('OPTIONS')

    describe('content type request header', function () {
      beforeEach(function () {
        app.post('/', function (req, res) {
          res.header('received-content-type', req.headers['content-type'])
          res.header('content-type', 'text/plain')
          req.pipe(res)
        })
      })

      it('can upload JSON as application/custom', function () {
        return httpism.post(baseurl, { json: 'json' }, { response: true, headers: { 'content-type': 'application/custom' } }).then(function (response) {
          expect(JSON.parse(response.body)).to.eql({
            json: 'json'
          })
          expect(response.headers['received-content-type']).to.eql('application/custom')
        })
      })

      it('can upload form as application/custom', function () {
        return httpism.post(baseurl, { json: 'json' }, {
          response: true,
          form: true,
          headers: {
            'content-type': 'application/custom'
          }
        }).then(function (response) {
          expect(qs.parse(response.body)).to.eql({
            json: 'json'
          })
          expect(response.headers['received-content-type']).to.eql('application/custom')
        })
      })

      it('can upload string as application/custom', function () {
        return httpism.post(baseurl, 'a string', {
          response: true,
          headers: {
            'content-type': 'application/custom'
          }
        }).then(function (response) {
          expect(response.body).to.eql('a string')
          expect(response.headers['received-content-type']).to.eql('application/custom')
        })
      })
    })

    describe('content-length header', function () {
      var unicodeText = '♫♫♫♫♪ ☺'

      beforeEach(function () {
        return app.post('/', function (req, res) {
          res.send({
            'content-length': req.headers['content-length'],
            'transfer-encoding': req.headers['transfer-encoding']
          })
        })
      })

      it('sends content-length, and not transfer-encoding: chunked, with JSON', function () {
        return httpism.post(baseurl, { json: unicodeText }).then(function (body) {
          expect(body).to.eql({
            'content-length': Buffer.byteLength(JSON.stringify({
              json: unicodeText
            })).toString()
          })
        })
      })

      it('sends content-length, and not transfer-encoding: chunked, with plain text', function () {
        return httpism.post(baseurl, unicodeText).then(function (body) {
          expect(body).to.eql({
            'content-length': Buffer.byteLength(unicodeText).toString()
          })
        })
      })

      it('sends content-length, and not transfer-encoding: chunked, with form data', function () {
        return httpism.post(baseurl, { formData: unicodeText }, {
          form: true
        }).then(function (response) {
          expect(response).to.eql({
            'content-length': Buffer.byteLength(qs.stringify({
              formData: unicodeText
            })).toString()
          })
        })
      })
    })

    describe('accept request header', function () {
      beforeEach(function () {
        app.get('/', function (req, res) {
          res.header('content-type', 'text/plain')
          res.send(req.headers.accept)
        })
      })

      it('sends Accept: application/json by default', function () {
        return httpism.get(baseurl).then(function (body) {
          expect(body).to.eql('application/json')
        })
      })

      it('can send a custom Accept header', function () {
        return httpism.get(baseurl, {
          headers: {
            accept: 'application/custom'
          }
        }).then(function (body) {
          expect(body).to.eql('application/custom')
        })
      })

      it('can send a custom Accept header even mixed case', function () {
        return httpism.get(baseurl, {
          headers: {
            Accept: 'application/custom'
          }
        }).then(function (body) {
          expect(body).to.eql('application/custom')
        })
      })
    })

    describe('request headers', function () {
      it('can specify headers for the request', function () {
        app.get('/', function (req, res) {
          res.send({
            'x-header': req.headers['x-header']
          })
        })

        return httpism.get(baseurl, {
          headers: {
            'x-header': 'haha'
          }
        }).then(function (body) {
          expect(body['x-header']).to.equal('haha')
        })
      })
    })

    describe('text', function () {
      function itReturnsAStringForContentType (mimeType) {
        it('returns a string if the content-type is ' + mimeType, function () {
          app.get('/', function (req, res) {
            res.header('content-type', mimeType)
            res.send('content as string')
          })

          return httpism.get(baseurl).then(function (body) {
            expect(body).to.equal('content as string')
          })
        })
      }

      itReturnsAStringForContentType('text/plain')
      itReturnsAStringForContentType('text/html')
      itReturnsAStringForContentType('text/css')
      itReturnsAStringForContentType('text/javascript')
      itReturnsAStringForContentType('application/javascript')

      it('will upload a string as text/plain', function () {
        app.post('/text', function (req, res) {
          res.header('received-content-type', req.headers['content-type'])
          res.header('content-type', 'text/plain')
          req.pipe(res)
        })

        return httpism.post(baseurl + '/text', 'content as string', {response: true}).then(function (response) {
          expect(response.headers['received-content-type']).to.equal('text/plain')
          expect(response.body).to.equal('content as string')
        })
      })
    })

    describe('params', function () {
      beforeEach(function () {
        app.get('/auth', function (req, res) {
          res.send(basicAuth(req) || {})
        })

        app.get('*', function (req, res) {
          res.send(req.url)
        })
      })

      it('can set params', function () {
        return httpism.get(baseurl + '/:a', {
          params: {
            a: 'aa',
            b: 'bb'
          }
        }).then(function (body) {
          expect(body).to.eql('/aa?b=bb')
        })
      })

      it('can set path params', function () {
        return httpism.get(baseurl + '/:a*/:b', {
          params: {
            a: 'a/long/path',
            b: 'bb'
          }
        }).then(function (body) {
          expect(body).to.eql('/a/long/path/bb')
        })
      })

      it("doesn't replace credentials", function () {
        return httpism.get('http://user:pass@localhost:' + port + '/auth', {
          params: {
            a: 'a/long/path',
            b: 'bb'
          }
        }).then(function (body) {
          expect(body).to.eql({name: 'user', pass: 'pass'})
        })
      })

      it('uses escapes', function () {
        return httpism.get(baseurl + '/:a/:b', {
          params: {
            a: 'a/a',
            b: 'b/b',
            c: 'c/c'
          }
        }).then(function (body) {
          expect(body).to.eql('/a%2Fa/b%2Fb?c=c%2Fc')
        })
      })

      it('can use other template engines', function () {
        return httpism.get(baseurl + '/{a}{?b,c}', {
          params: {
            a: 'x',
            b: 'y',
            c: 'z'
          },
          expandUrl: function (url, params) {
            var template = urlTemplate.parse(url)
            return template.expand(params)
          }
        }).then(function (body) {
          expect(body).to.eql('/x?b=y&c=z')
        })
      })
    })

    describe('.client()', function () {
      it('can make a new client that adds headers', function () {
        app.get('/', function (req, res) {
          res.send({
            joke: req.headers.joke
          })
        })

        var client = httpism.client(function (request, next) {
          request.headers.joke = 'a chicken...'
          return next(request)
        })

        return client.get(baseurl).then(function (body) {
          expect(body).to.eql({
            joke: 'a chicken...'
          })
        })
      })

      it('can make a new client that adds headers by passing them to options', function () {
        app.get('/', function (req, res) {
          res.send({
            x: req.headers.x,
            y: req.headers.y
          })
        })

        var client = httpism.client('/', { headers: { x: '123' } }).client('/', { headers: { y: '456' } })

        return client.get(baseurl).then(function (body) {
          expect(body).to.eql({
            x: '123',
            y: '456'
          })
        })
      })

      it('makes requests with additional headers', function () {
        app.get('/', function (req, res) {
          res.send({
            x: req.headers.x,
            y: req.headers.y
          })
        })

        var client = httpism.client({ headers: { x: '123' } })

        return client.get(baseurl, { headers: { y: '456' } }).then(function (body) {
          expect(body).to.eql({
            x: '123',
            y: '456'
          })
        })
      })

      describe('cache example', function () {
        var filename = pathUtils.join(__dirname, 'cachefile.txt')

        beforeEach(function () {
          return fs.writeFile(filename, '{"from": "cache"}')
        })

        afterEach(function () {
          return fs.unlink(filename)
        })

        it('can insert a new middleware just before the http request, dealing with streams', function () {
          app.get('/', function (req, res) {
            res.send({from: 'server'})
          })

          var cache = function (req, next) {
            return next().then(function (response) {
              response.body = fs.createReadStream(filename)
              return response
            })
          }

          cache.httpismMiddleware = {
            before: 'http'
          }

          var http = httpism.client(cache)

          return http.get(baseurl).then(function (body) {
            expect(body).to.eql({from: 'cache'})
          })
        })
      })

      describe('middleware', function () {
        describe('defining middleware', function () {
          var client

          beforeEach(function () {
            app.get('/', function (req, res) {
              res.send(req.query)
            })

            client = httpism.client(baseurl)
          })

          it('can modify the request', function () {
            client.use(function (req, next) {
              req.url += '?param=hi'
              return next()
            })

            return client.get('/').then(function (response) {
              expect(response).to.eql({param: 'hi'})
            })
          })

          it('can send an entirely new request', function () {
            client.use(function (req, next) {
              return next({
                url: req.url + '?param=hi',
                options: {},
                headers: {}
              })
            })

            return client.get('/').then(function (response) {
              expect(response).to.eql({param: 'hi'})
            })
          })

          it('can return an entirely new response', function () {
            client.use(function (req, next) {
              return next().then(function (response) {
                return {
                  body: 'body'
                }
              })
            })

            return client.get('/').then(function (response) {
              expect(response).to.eql('body')
            })
          })
        })

        describe('inserting middleware', function () {
          var pipeline, a, b

          function middlwareNamed (name) {
            function middleware () {
            }

            middleware.httpismMiddleware = {
              name: name
            }

            return middleware
          }

          beforeEach(function () {
            pipeline = httpism.raw.client()
            pipeline.middleware = [
              a = middlwareNamed('a'),
              b = middlwareNamed('b')
            ]
          })

          describe('before', function () {
            it('can insert middleware before another', function () {
              var m = function () {}
              m.httpismMiddleware = {
                before: 'b'
              }

              var client = pipeline.client(m)

              expect(client.middleware).to.eql([
                a,
                m,
                b
              ])
            })

            it('can insert middleware into same client before another', function () {
              var m = function () {}
              m.httpismMiddleware = {
                before: 'b'
              }

              pipeline.use(m)

              expect(pipeline.middleware).to.eql([
                a,
                m,
                b
              ])
            })

            it('inserts before the named middleware if at least one is found', function () {
              var m = function () {}
              m.httpismMiddleware = {
                before: ['b', 'c']
              }

              var client = pipeline.client(m)
              expect(client.middleware).to.eql([
                a,
                m,
                b
              ])
            })

            it('inserts before all the named middleware if all are found', function () {
              var m = function () {}
              m.httpismMiddleware = {
                before: ['b', 'b']
              }
              var client = pipeline.client(m)
              expect(client.middleware).to.eql([
                a,
                m,
                b
              ])
            })
          })

          describe('after', function () {
            it('can insert middleware after another', function () {
              var m = function () {}
              m.httpismMiddleware = {
                after: 'a'
              }
              var client = pipeline.client(m)
              expect(client.middleware).to.eql([
                a,
                m,
                b
              ])
            })

            it('inserts after the named middleware if at lesat one is found', function () {
              var m = function () {}
              m.httpismMiddleware = {
                after: ['a', 'c']
              }
              var client = pipeline.client(m)
              expect(client.middleware).to.eql([
                a,
                m,
                b
              ])
            })

            it('inserts after all the named middleware if all are found', function () {
              var m = function () {}
              m.httpismMiddleware = {
                after: ['a', 'b']
              }
              var client = pipeline.client(m)
              expect(client.middleware).to.eql([
                a,
                b,
                m
              ])
            })
          })

          it('can remove middleware', function () {
            pipeline.remove('b')

            expect(pipeline.middleware).to.eql([
              a
            ])
          })

          it('throws if before middleware name cannot be found', function () {
            var m = function () {}
            m.httpismMiddleware = {
              before: 'notfound'
            }
            expect(function () { httpism.client(m) }).to.throw('no such middleware: notfound')
          })

          it('throws if none of the before middleware names can be found', function () {
            var m = function () {}
            m.httpismMiddleware = {
              before: ['notfound']
            }
            expect(function () { httpism.client(m) }).to.throw('no such middleware: notfound')
          })

          it('throws if after middleware name cannot be found', function () {
            var m = function () {}
            m.httpismMiddleware = {
              after: 'notfound'
            }
            expect(function () { httpism.client(m) }).to.throw('no such middleware: notfound')
          })

          it('throws if none of the after middleware names can be found', function () {
            var m = function () {}
            m.httpismMiddleware = {
              after: ['notfound']
            }
            expect(function () { httpism.client(m) }).to.throw('no such middleware: notfound')
          })
        })
      })

      describe('2.x compatibility', function () {
        it('can be created using `.api()`', function () {
          app.get('/', function (req, res) {
            res.send({
              joke: req.headers.joke
            })
          })

          var client = httpism.api(function (request, next) {
            request.headers.joke = 'a chicken...'
            return next(request)
          })

          return client.get(baseurl).then(function (body) {
            expect(body).to.eql({
              joke: 'a chicken...'
            })
          })
        })
      })

      describe('query strings (deprecated)', function () {
        beforeEach(function () {
          app.get('/', function (req, res) {
            res.send(req.query)
          })
        })

        it('can set query string', function () {
          return httpism.get(baseurl, {
            querystring: {
              a: 'a',
              b: 'b'
            }
          }).then(function (body) {
            expect(body).to.eql({
              a: 'a',
              b: 'b'
            })
          })
        })

        it('can override query string in url', function () {
          return httpism.get(baseurl + '/?a=a&c=c', {
            querystring: {
              a: 'newa',
              b: 'b'
            }
          }).then(function (body) {
            expect(body).to.eql({
              a: 'newa',
              b: 'b',
              c: 'c'
            })
          })
        })
      })
    })

    describe('exceptions', function () {
      beforeEach(function () {
        app.get('/400', function (req, res) {
          res.status(400).send({
            message: 'oh dear'
          })
        })
      })

      it('throws exceptions on 400-500 status codes, by default', function () {
        return httpism.client(baseurl).get('/400').then(function () {
          assert.fail('expected an exception to be thrown')
        }).catch(function (e) {
          expect(e.message).to.equal('GET ' + baseurl + '/400 => 400 Bad Request')
          expect(e.statusCode).to.equal(400)
          expect(e.body.message).to.equal('oh dear')
        })
      })

      it("doesn't include the password in the error message", function () {
        return httpism.client('http://user:pass@localhost:' + port + '/').get('/400').then(function () {
          assert.fail('expected an exception to be thrown')
        }).catch(function (e) {
          expect(e.message).to.equal('GET http://user:********@localhost:' + port + '/400 => 400 Bad Request')
          expect(e.statusCode).to.equal(400)
          expect(e.body.message).to.equal('oh dear')
        })
      })

      it("doesn't throw exceptions on 400-500 status codes, when specified", function () {
        return httpism.client(baseurl).get('/400', { exceptions: false }).then(function (body) {
          expect(body.message).to.equal('oh dear')
        })
      })

      describe('error predicate', function () {
        it('throws exceptions when predicate returns true', function () {
          function isError (response) {
            return response.statusCode === 400
          }

          return httpism.client(baseurl).get('/400', { exceptions: isError }).then(function () {
            assert.fail('expected an exception to be thrown')
          }).catch(function (e) {
            expect(e.message).to.equal('GET ' + baseurl + '/400 => 400 Bad Request')
            expect(e.statusCode).to.equal(400)
            expect(e.body.message).to.equal('oh dear')
          })
        })

        it("doesn't throw exceptions when predicate returns false", function () {
          function isError (response) {
            return response.statusCode !== 400
          }

          return httpism.client(baseurl).get('/400', { exceptions: isError }).then(function (body) {
            expect(body.message).to.equal('oh dear')
          })
        })
      })

      it('throws if it cannot connect', function () {
        return expect(httpism.get('http://localhost:50000/')).to.eventually.be.rejectedWith('ECONNREFUSED')
      })
    })

    describe('options', function () {
      var client

      beforeEach(function () {
        client = httpism.client(function (request, next) {
          request.body = request.options
          return next(request)
        }, { a: 'a' })

        app.post('/', function (req, res) {
          res.send(req.body)
        })
      })

      it('clients have options, which can be overwritten on each request', function () {
        var root = client.client(baseurl)
        return root.post('', undefined, { b: 'b' }).then(function (body) {
          expect(body).to.eql({
            a: 'a',
            b: 'b'
          })

          return root.client().post('', undefined, { c: 'c' }).then(function (body) {
            expect(body).to.eql({
              a: 'a',
              c: 'c'
            })

            return root.post('', undefined).then(function (body) {
              expect(body).eql({
                a: 'a'
              })
            })
          })
        })
      })
    })

    describe('responses', function () {
      beforeEach(function () {
        app.get('/', function (req, res) {
          res.set({'x-custom-header': 'header value'})
          res.status(234)
          res.send({data: 'data'})
        })
      })

      describe('response: true', function () {
        var response

        beforeEach(function () {
          return httpism.get(baseurl, {response: true}).then(function (_response) {
            response = _response
          })
        })

        it('contains the url', function () {
          expect(response.url).to.equal(baseurl)
        })

        it('contains the status code', function () {
          expect(response.statusCode).to.equal(234)
        })

        it('contains the headers', function () {
          expect(response.headers['x-custom-header']).to.equal('header value')
        })

        it('contains the body', function () {
          expect(response.body).to.eql({data: 'data'})
        })
      })

      describe('response: false (default)', function () {
        var body

        beforeEach(function () {
          return httpism.get(baseurl).then(function (_body) {
            body = _body
          })
        })

        describe('2.x compatibility', function () {
          it('contains the url', function () {
            expect(body.url).to.equal(baseurl)
          })

          it('contains the status code', function () {
            expect(body.statusCode).to.equal(234)
          })

          it('contains the headers', function () {
            expect(body.headers['x-custom-header']).to.equal('header value')
          })

          it('contains the body', function () {
            expect(body.body).to.eql({data: 'data'})
          })
        })

        it('returns the body', function () {
          expect(body).to.eql({data: 'data'})
        })
      })
    })

    describe('redirects', function () {
      beforeEach(function () {
        app.get('/redirecttoredirect', function (req, res) {
          res.redirect('/redirect')
        })

        app.get('/redirect', function (req, res) {
          res.location('/path/')
          res.status(302).send({
            path: req.path
          })
        })
        app.get('/', function (req, res) {
          res.send({
            path: req.path
          })
        })
        app.get('/path/', function (req, res) {
          res.send({
            path: req.path
          })
        })
        app.get('/path/file', function (req, res) {
          res.send({
            path: req.path
          })
        })
      })

      it('follows redirects by default', function () {
        return httpism.get(baseurl + '/redirect', {response: true}).then(function (response) {
          expect(response.body).to.eql({
            path: '/path/'
          })
          expect(response.url).to.eql(baseurl + '/path/')
        })
      })

      function itFollowsRedirects (statusCode) {
        it('follows ' + statusCode + ' redirects', function () {
          app.get('/' + statusCode, function (req, res) {
            res.location('/path/')
            res.status(statusCode).send()
          })

          return httpism.get(baseurl + '/' + statusCode, {response: true}).then(function (response) {
            expect(response.body).to.eql({
              path: '/path/'
            })
            expect(response.url).to.eql(baseurl + '/path/')
          })
        })
      }

      describe('redirects', function () {
        itFollowsRedirects(300)
        itFollowsRedirects(301)
        itFollowsRedirects(302)
        itFollowsRedirects(303)
        itFollowsRedirects(307)
      })

      it('follows a more than one redirect', function () {
        return httpism.get(baseurl + '/redirecttoredirect', {response: true}).then(function (response) {
          expect(response.body).to.eql({
            path: '/path/'
          })
          expect(response.url).to.eql(baseurl + '/path/')
        })
      })

      it("doesn't follow redirects when specified", function () {
        return httpism.get(baseurl + '/redirect', {
          redirect: false,
          response: true
        }).then(function (response) {
          expect(response.body).to.eql({
            path: '/redirect'
          })
          expect(response.url).to.eql(baseurl + '/redirect')
          expect(response.headers.location).to.equal('/path/')
          expect(response.statusCode).to.equal(302)
        })
      })
    })

    describe('cookies', function () {
      beforeEach(function () {
        app.use(cookieParser())
        app.get('/setcookie', function (req, res) {
          res.cookie('mycookie', 'value')
          res.send({})
        })
        app.get('/getcookie', function (req, res) {
          res.send(req.cookies)
        })
      })

      it('can store cookies and send cookies', function () {
        var cookies = new toughCookie.CookieJar()
        return httpism.get(baseurl + '/setcookie', {
          cookies: cookies
        }).then(function () {
          return httpism.get(baseurl + '/getcookie', {
            cookies: cookies
          }).then(function (body) {
            expect(body).to.eql({
              mycookie: 'value'
            })
          })
        })
      })

      it('can store cookies and send cookies', function () {
        var client = httpism.client(baseurl, {
          cookies: true
        })
        return client.get(baseurl + '/setcookie').then(function () {
          return client.get(baseurl + '/getcookie').then(function (body) {
            expect(body).to.eql({
              mycookie: 'value'
            })
          })
        })
      })
    })

    describe('https', function () {
      var httpsServer
      var httpsPort = 23456
      var httpsBaseurl = 'https://localhost:' + httpsPort + '/'

      beforeEach(function () {
        var credentials = {
          key: fs.readFileSync(pathUtils.join(__dirname, 'server.key'), 'utf-8'),
          cert: fs.readFileSync(pathUtils.join(__dirname, 'server.crt'), 'utf-8')
        }
        httpsServer = https.createServer(credentials, app)
        httpsServer.listen(httpsPort)
      })

      afterEach(function () {
        httpsServer.close()
      })

      it('can make HTTPS requests', function () {
        app.get('/', function (req, res) {
          res.send({
            protocol: req.protocol
          })
        })

        return httpism.get(httpsBaseurl, { https: { rejectUnauthorized: false } }).then(function (body) {
          expect(body.protocol).to.equal('https')
        })
      })
    })

    describe('forms', function () {
      it('can upload application/x-www-form-urlencoded', function () {
        app.post('/form', function (req, res) {
          res.header('content-type', 'text/plain')
          res.header('received-content-type', req.headers['content-type'])
          req.pipe(res)
        })

        return httpism.post(baseurl + '/form', {
          name: 'Betty Boop',
          address: 'one & two'
        }, {
          form: true,
          response: true
        }).then(function (response) {
          expect(response.body).to.equal('name=Betty%20Boop&address=one%20%26%20two')
          expect(response.headers['received-content-type']).to.equal('application/x-www-form-urlencoded')
        })
      })

      it('can download application/x-www-form-urlencoded', function () {
        app.get('/form', function (req, res) {
          res.header('content-type', 'application/x-www-form-urlencoded')
          res.send(qs.stringify({
            name: 'Betty Boop',
            address: 'one & two'
          }))
        })

        return httpism.get(baseurl + '/form', {response: true}).then(function (response) {
          expect(response.body).to.eql({
            name: 'Betty Boop',
            address: 'one & two'
          })
          expect(response.headers['content-type']).to.equal('application/x-www-form-urlencoded; charset=utf-8')
        })
      })

      describe('multipart forms', function () {
        var filename = pathUtils.join(__dirname, 'afile.jpg')

        beforeEach(function () {
          return fs.writeFile(filename, 'an image')
        })

        afterEach(function () {
          return fs.unlink(filename)
        })

        it('can send multipart forms with `form-data`', function () {
          app.post('/form', function (req, res) {
            var form = new multiparty.Form()

            form.parse(req, function (err, fields, files) {
              if (err) {
                console.log(err)
                res.status(500).send({message: err.message})
              }
              var response = {}

              Object.keys(fields).forEach(function (field) {
                response[field] = fields[field][0]
              })
              Promise.all(Object.keys(files).map(function (field) {
                var file = files[field][0]
                return middleware.streamToString(fs.createReadStream(file.path)).then(function (contents) {
                  response[field] = {
                    contents: contents,
                    headers: file.headers
                  }
                })
              })).then(function () {
                res.send(response)
              })
            })
          })

          var form = new FormData()

          form.append('name', 'Betty Boop')
          form.append('address', 'one & two')
          form.append('photo', fs.createReadStream(filename))

          return httpism.post(baseurl + '/form', form).then(function (body) {
            expect(body).to.eql({
              name: 'Betty Boop',
              address: 'one & two',
              photo: {
                contents: 'an image',
                headers: {
                  'content-disposition': 'form-data; name="photo"; filename="afile.jpg"',
                  'content-type': 'image/jpeg'
                }
              }
            })
          })
        })
      })
    })

    describe('basic authentication', function () {
      beforeEach(function () {
        app.use(basicAuthConnect(function (user, pass) {
          return user === 'good user' && pass === 'good password!'
        }))
        return app.get('/secret', function (req, res) {
          res.send('this is secret')
        })
      })

      it('can authenticate using username password', function () {
        return httpism.get(baseurl + '/secret', {
          basicAuth: {
            username: 'good user',
            password: 'good password!'
          }
        }).then(function (body) {
          expect(body).to.equal('this is secret')
        })
      })

      it('can authenticate using username password encoded in URL', function () {
        var u = encodeURIComponent
        return httpism.get('http://' + u('good user') + ':' + u('good password!') + '@localhost:' + port + '/secret').then(function (body) {
          expect(body).to.equal('this is secret')
        })
      })

      it('can authenticate using username with colons :', function () {
        return httpism.get(baseurl + '/secret', {
          basicAuth: {
            username: 'good: :user',
            password: 'good password!'
          }
        }).then(function (body) {
          expect(body).to.equal('this is secret')
        })
      })

      it("doesn't crash if username or password are undefined", function () {
        return httpism.get(baseurl + '/secret', {
          basicAuth: {
          },
          exceptions: false,
          response: true
        }).then(function (response) {
          expect(response.statusCode).to.equal(401)
        })
      })

      it('fails to authenticate when password is incorrect', function () {
        return httpism.get(baseurl + '/secret', {
          basicAuth: {
            username: 'good user',
            password: 'bad password!'
          },
          exceptions: false
        }).then(function (response) {
          expect(response.statusCode).to.equal(401)
        })
      })
    })
  })

  describe('streams', function () {
    var filename = pathUtils.join(__dirname, 'afile.txt')

    beforeEach(function () {
      return fs.writeFile(filename, 'some content').then(function () {
        app.post('/file', function (req, res) {
          res.header('content-type', 'text/plain')
          res.header('received-content-type', req.headers['content-type'])
          req.unshift('received: ')
          req.pipe(res)
        })

        app.get('/file', function (req, res) {
          var stream
          stream = fs.createReadStream(filename)
          res.header('content-type', 'application/blah')
          stream.pipe(res)
        })
      })
    })

    afterEach(function () {
      return fs.unlink(filename)
    })

    function itCanUploadAStreamWithContentType (contentType) {
      it('can upload a stream with Content-Type: ' + contentType, function () {
        var stream = fs.createReadStream(filename)

        return httpism.post(baseurl + '/file', stream, {
          headers: {
            'content-type': contentType
          },
          response: true
        }).then(function (response) {
          expect(response.headers['received-content-type']).to.equal(contentType)
          expect(response.body).to.equal('received: some content')
        })
      })
    }

    itCanUploadAStreamWithContentType('application/blah')
    itCanUploadAStreamWithContentType('application/json')
    itCanUploadAStreamWithContentType('text/plain')
    itCanUploadAStreamWithContentType('application/x-www-form-urlencoded')

    it('it guesses the Content-Type of the stream when created from a file', function () {
      var stream = fs.createReadStream(filename)

      return httpism.post(baseurl + '/file', stream, {response: true}).then(function (response) {
        expect(response.headers['received-content-type']).to.equal('text/plain')
        expect(response.body).to.equal('received: some content')
      })
    })

    it('can download a stream', function () {
      return httpism.get(baseurl + '/file', {response: true}).then(function (response) {
        expect(response.headers['content-type']).to.equal('application/blah')
        return middleware.streamToString(response.body).then(function (response) {
          expect(response).to.equal('some content')
        })
      })
    })

    describe('forcing response parsing', function () {
      function describeForcingResponse (type, options) {
        var contentType = options !== undefined && Object.prototype.hasOwnProperty.call(options, 'contentType') && options.contentType !== undefined ? options.contentType : undefined
        var content = options !== undefined && Object.prototype.hasOwnProperty.call(options, 'content') && options.content !== undefined ? options.content : undefined
        var sendContent = options !== undefined && Object.prototype.hasOwnProperty.call(options, 'sendContent') && options.sendContent !== undefined ? options.sendContent : undefined

        describe(type, function () {
          it('can download a stream of content-type ' + contentType, function () {
            app.get('/content', function (req, res) {
              var stream = fs.createReadStream(filename)
              res.header('content-type', contentType)
              stream.pipe(res)
            })

            return httpism.get(baseurl + '/content', {
              responseBody: 'stream',
              response: true
            }).then(function (response) {
              expect(response.headers['content-type']).to.equal(contentType)
              return middleware.streamToString(response.body).then(function (response) {
                expect(response).to.equal('some content')
              })
            })
          })

          it('can force parse ' + type + ' when content-type is application/blah', function () {
            app.get('/content', function (req, res) {
              res.header('content-type', 'application/blah')
              res.send(sendContent || content)
            })

            return httpism.get(baseurl + '/content', {
              responseBody: type,
              response: true
            }).then(function (response) {
              expect(response.headers['content-type']).to.equal('application/blah; charset=utf-8')
              expect(response.body).to.eql(content)
            })
          })
        })
      }

      describeForcingResponse('text', {
        contentType: 'text/plain; charset=utf-8',
        content: 'some text content'
      })
      describeForcingResponse('json', {
        contentType: 'application/json',
        content: {
          json: true
        }
      })
      describeForcingResponse('form', {
        contentType: 'application/x-www-form-urlencoded',
        content: {
          json: 'true'
        },
        sendContent: qs.stringify({
          json: 'true'
        })
      })
    })
  })

  describe('proxy', function () {
    var proxyServer
    var proxyPort = 12346
    var proxy
    var urlProxied
    var proxied
    var proxyAuth = false
    var proxyUrl = 'http://localhost:' + proxyPort + '/'
    var secureProxyUrl = 'http://bob:secret@localhost:' + proxyPort + '/'

    function proxyRequest (req, res) {
      urlProxied = req.url
      proxied = true
      proxy.web(req, res, { target: req.url })
    }

    function checkProxyAuthentication (req, res, next) {
      var expectedAuthorisation = 'Basic ' + Buffer.from('bob:secret').toString('base64')

      if (expectedAuthorisation === req.headers['proxy-authorization']) {
        next(req, res)
      } else {
        res.statusCode = 407
        res.end('bad proxy authentication')
      }
    }

    beforeEach(function () {
      urlProxied = undefined
      proxied = false
      proxy = httpProxy.createProxyServer()

      proxyServer = http.createServer(function (req, res) {
        if (proxyAuth) {
          return checkProxyAuthentication(req, res, proxyRequest)
        } else {
          return proxyRequest(req, res)
        }
      })
      proxyServer.listen(proxyPort)

      proxyServer.on('connect', function (req, socket) {
        proxied = true
        var addr = req.url.split(':')
        // creating TCP connection to remote server
        var conn = net.connect(addr[1] || 443, addr[0], function () {
          // tell the client that the connection is established
          socket.write('HTTP/' + req.httpVersion + ' 200 OK\r\n\r\n', 'UTF-8', function () {
            // creating pipes in both ends
            conn.pipe(socket)
            socket.pipe(conn)
          })
        })

        conn.on('error', function (e) {
          console.log('Server connection error: ' + e, addr)
          socket.end()
        })
      })
    })

    afterEach(function () {
      proxyServer.close()
    })

    var httpsServer
    var httpsPort = 23456
    var httpsBaseurl = 'https://localhost:' + httpsPort + '/'

    beforeEach(function () {
      var credentials = {
        key: fs.readFileSync(pathUtils.join(__dirname, 'server.key'), 'utf-8'),
        cert: fs.readFileSync(pathUtils.join(__dirname, 'server.crt'), 'utf-8')
      }
      httpsServer = https.createServer(credentials, app)
      httpsServer.listen(httpsPort)
    })

    afterEach(function () {
      httpsServer.close()
    })

    context('unsecured proxy', function () {
      it('can use a proxy', function () {
        app.get('/', function (req, res) {
          res.send({
            blah: 'blah'
          })
        })

        return httpism.get(baseurl, {proxy: proxyUrl}).then(function (body) {
          expect(body).to.eql({blah: 'blah'})
          expect(urlProxied).to.equal(baseurl)
        })
      })

      it('can make HTTPS requests', function () {
        app.get('/', function (req, res) {
          res.send({
            protocol: req.protocol
          })
        })

        return httpism.get(httpsBaseurl, { proxy: proxyUrl, https: { rejectUnauthorized: false } }).then(function (body) {
          expect(body.protocol).to.equal('https')
        })
      })
    })

    context('proxy environment variables', function () {
      beforeEach(function () {
        app.get('/', function (req, res) {
          res.send({
            blah: 'blah'
          })
        })
      })

      beforeEach(function () {
        delete process.env.NO_PROXY
        delete process.env.no_proxy
        delete process.env.HTTP_PROXY
        delete process.env.http_proxy
        delete process.env.HTTPS_PROXY
        delete process.env.https_proxy
      })

      function assertProxied (url) {
        return httpism.get(url, { https: { rejectUnauthorized: false } }).then(function () {
          expect(proxied).to.equal(true)
        })
      }

      function assertNotProxied (url) {
        return httpism.get(url, { https: { rejectUnauthorized: false } }).then(function () {
          expect(proxied).to.equal(false)
        })
      }

      it('uses http_proxy for HTTP requests', function () {
        process.env.http_proxy = proxyUrl

        return assertProxied(baseurl)
      })

      it('uses HTTP_PROXY for HTTP requests', function () {
        process.env.HTTP_PROXY = proxyUrl

        return assertProxied(baseurl)
      })

      it('uses https_proxy for HTTPS requests', function () {
        process.env.https_proxy = proxyUrl

        return assertProxied(httpsBaseurl)
      })

      it('uses HTTPS_PROXY for HTTPS requests', function () {
        process.env.HTTPS_PROXY = proxyUrl

        return assertProxied(httpsBaseurl)
      })

      it('use skips hosts defined in no_proxy', function () {
        process.env.HTTP_PROXY = proxyUrl
        process.env.no_proxy = 'localhost'

        return assertNotProxied(httpsBaseurl)
      })

      it('use skips hosts defined in NO_PROXY', function () {
        process.env.HTTP_PROXY = proxyUrl
        process.env.NO_PROXY = 'localhost'

        return assertNotProxied(baseurl)
      })
    })

    context('secured proxy', function () {
      it('can use a proxy', function () {
        app.get('/', function (req, res) {
          res.send({
            blah: 'blah'
          })
        })

        return httpism.get(baseurl, {proxy: secureProxyUrl}).then(function (body) {
          expect(body).to.eql({blah: 'blah'})
          expect(urlProxied).to.equal(baseurl)
        })
      })

      it('can make HTTPS requests', function () {
        app.get('/', function (req, res) {
          res.send({
            protocol: req.protocol
          })
        })

        return httpism.get(httpsBaseurl, { proxy: secureProxyUrl, https: { rejectUnauthorized: false } }).then(function (body) {
          expect(body.protocol).to.equal('https')
        })
      })
    })
  })

  describe('raw', function () {
    it('can be used to create new middleware pipelines', function () {
      app.get('/', function (req, res) {
        res.status(400).send({
          blah: 'blah'
        })
      })

      var client = httpism.raw.client(baseurl, function (request, next) {
        return next().then(function (res) {
          return middleware.streamToString(res.body).then(function (response) {
            res.body = response
            return res
          })
        })
      })

      return client.get(baseurl, {response: true}).then(function (response) {
        expect(response.statusCode).to.equal(400)
        expect(JSON.parse(response.body)).to.eql({
          blah: 'blah'
        })
      })
    })
  })

  describe('json reviver', function () {
    it('controls how the JSON response is deserialised', function () {
      app.get('/', function (req, res) {
        res.status(200).send({ blah: 1234 })
      })

      var client = httpism.client(baseurl, {
        jsonReviver: function (key, value) {
          if (key === '') { return value }
          return key + value + '!'
        }
      })

      return client.get(baseurl, {response: true}).then(function (response) {
        expect(response.statusCode).to.equal(200)
        expect(response.body).to.eql({
          blah: 'blah1234!'
        })
      })
    })
  })

  describe('obfuscating passwords', function () {
    it('can obfuscate passwords from http URLs', function () {
      var obfuscated = obfuscateUrlPassword('https://user:password@example.com/a/:path/user:password/user:password.thing')
      expect(obfuscated).to.equal('https://user:********@example.com/a/:path/user:password/user:password.thing')
    })

    it("doesn't do anything to relative paths", function () {
      var obfuscated = obfuscateUrlPassword('/a/:path/user:password/user:password.thing')
      expect(obfuscated).to.equal('/a/:path/user:password/user:password.thing')
    })

    it("doesn't do anything to hosts with ports", function () {
      var obfuscated = obfuscateUrlPassword('http://localhost:4000/a/:path/user:password/user:password.thing')
      expect(obfuscated).to.equal('http://localhost:4000/a/:path/user:password/user:password.thing')
    })
  })

  describe('output', function () {
    var filename = pathUtils.join(__dirname, 'streamfile.txt')

    afterEach(function () {
      return fs.unlink(filename)
    })

    it('can write to an output stream and wait for end', function () {
      app.get('/', function (req, res) {
        res.send('contents')
      })

      return httpism.get(baseurl, {output: fs.createWriteStream(filename)}).then(function () {
        expect(fs.readFileSync(filename, 'utf-8')).to.equal('contents')
      })
    })
  })

  describe('timeouts', function () {
    it('can set the timeout', function () {
      app.get('/', function (req, res) {
        // don't respond
      })

      var startTime = Date.now()
      return expect(httpism.get(baseurl, {timeout: 20})).to.eventually.be.rejectedWith('timeout').then(function () {
        expect(Date.now() - startTime).to.be.within(20, 50)
      })
    })
  })

  describe('cache', function () {
    var version
    var cachePath

    beforeEach(function () {
      version = 1
      cachePath = pathUtils.join(__dirname, 'cache')

      app.get('/', function (req, res) {
        res.set('x-version', version)
        res.send({version: version})
      })

      app.get('/binary', function (req, res) {
        res.set('x-version', version)
        res.send(Buffer.from([1, 3, 3, 7, version]))
      })

      return clearCache()
    })

    function clearCache () {
      return fs.remove(cachePath)
    }

    it('caches responses', function () {
      var http = httpism.client(cache({url: cachePath}), {response: true})
      return http.get(baseurl).then(function (response) {
        expect(response.headers['x-version']).to.eql('1')
        expect(response.body.version).to.equal(1)
      }).then(function () {
        version++
        return http.get(baseurl)
      }).then(function (response) {
        expect(response.headers['x-version']).to.eql('1')
        expect(response.body.version).to.equal(1)
      }).then(function () {
        return clearCache()
      }).then(function () {
        return http.get(baseurl)
      }).then(function (response) {
        expect(response.headers['x-version']).to.eql('2')
        expect(response.body.version).to.equal(2)
      })
    })

    function streamToBuffer (stream) {
      return new Promise(function (resolve, reject) {
        var buffers = []
        stream.on('data', function (buffer) {
          buffers.push(buffer)
        })
        stream.on('error', reject)
        stream.on('end', function () {
          resolve(Buffer.concat(buffers))
        })
      })
    }

    it('caches binary responses', function () {
      var http = httpism.client(cache({url: cachePath}), {response: true})
      return http.get(baseurl + '/binary').then(function (response) {
        expect(response.headers['x-version']).to.eql('1')
        return streamToBuffer(response.body)
      }).then(function (buffer) {
        expect(Array.from(buffer.values())).to.eql([1, 3, 3, 7, 1])
      }).then(function () {
        version++
        return http.get(baseurl + '/binary')
      }).then(function (response) {
        expect(response.headers['x-version']).to.eql('1')
        return streamToBuffer(response.body)
      }).then(function (buffer) {
        expect(Array.from(buffer.values())).to.eql([1, 3, 3, 7, 1])
      }).then(function () {
        return clearCache()
      }).then(function () {
        return http.get(baseurl + '/binary')
      }).then(function (response) {
        expect(response.headers['x-version']).to.eql('2')
        return streamToBuffer(response.body)
      }).then(function (buffer) {
        expect(Array.from(buffer.values())).to.eql([1, 3, 3, 7, 2])
      })
    })
  })
})
