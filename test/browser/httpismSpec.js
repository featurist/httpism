/* eslint-env mocha */
/* global File, FormData */

var chai = require('chai')
var expect = chai.expect
chai.use(require('chai-as-promised'))
var httpism = require('../..')
require('es6-promise').polyfill()
var serverSide = require('karma-server-side')
var FakeXMLHttpRequest = require('fake-xml-http-request')

var server = 'http://' + window.location.hostname + ':12345'
var badServer = 'http://' + window.location.hostname + ':12346'

describe('httpism', function () {
  before(function () {
    return serverSide.run(function () {
      if (this.server) {
        this.server.destroy()
      }

      var app = serverRequire('./test/browser/app') // eslint-disable-line no-undef
      var serverDestroy = serverRequire('server-destroy') // eslint-disable-line no-undef

      this.server = app.listen(12345)
      serverDestroy(this.server)
    })
  })

  describe('get', function () {
    it('can make a JSON GET request', function () {
      return httpism.get('/', {response: true}).then(function (response) {
        expect(response.body.method).to.equal('GET')
        expect(response.body.url).to.equal('/')
        expect(response.headers['content-type']).to.equal('application/json; charset=utf-8')
        expect(response.url).to.equal('/')
      })
    })

    it('can GET with query string', function () {
      return httpism.get('/', {response: true, params: {a: 'b', b: 'c', c: 'd'}}).then(function (response) {
        expect(response.body.method).to.equal('GET')
        expect(response.body.query).to.eql({a: 'b', b: 'c', c: 'd'})
        expect(response.body.url).to.equal('/?a=b&b=c&c=d')
        expect(response.headers['content-type']).to.equal('application/json; charset=utf-8')
        expect(response.url).to.equal('/?a=b&b=c&c=d')
      })
    })

    it('can make a string GET request', function () {
      return httpism.get('/text?text=asdf').then(function (body) {
        expect(body).to.equal('asdf')
      })
    })

    it('throws if receives 404', function () {
      return httpism.get('/status/404').then(function () {
        throw new Error('expected to throw exception')
      }, function (response) {
        expect(response.message).to.eql('GET /status/404 => 404 Not Found')
        expect(response.body.method).to.eql('GET')
        expect(response.headers['content-type']).to.equal('application/json; charset=utf-8')
        expect(response.url).to.equal('/status/404')
      })
    })
  })

  describe('jsonp', function () {
    it('can call JSONP', function () {
      return httpism.get(server + '/jsonp', {jsonp: 'callback'}).then(function (body) {
        expect(body).to.eql({blah: 'blah'})
      })
    })

    it('throws exception if there is an error', function () {
      return expect(httpism.get(server + '/404', {jsonp: 'callback'})).to.be.rejectedWith(server + '/404')
    })
  })
  describe('cookies', function () {
    it('can send and receive cookies', function () {
      return httpism.get('/cookies', {params: {a: 'b'}}).then(function () {
        expect(document.cookie).to.include('a=b')
        return httpism.get('/').then(function (body) {
          expect(body.cookies.a).to.equal('b')
        })
      })
    })

    describe('cross-domain', function () {
      beforeEach(function () {
        return httpism.get(server + '/cookies', {params: {a: ''}, withCredentials: true})
      })

      it("by default, doesn't send cookies cross-domain", function () {
        return httpism.get(server + '/cookies', {params: {a: 'b'}, withCredentials: true}).then(function () {
          return httpism.get(server + '/').then(function (body) {
            expect(body.cookies.a).to.equal(undefined)
          })
        })
      })

      it('withCredentials = true, sends cookies cross-domain', function () {
        return httpism.get(server + '/cookies', {params: {a: 'b'}, withCredentials: true}).then(function () {
          return httpism.get(server + '/', {withCredentials: true}).then(function (body) {
            expect(body.cookies.a).to.equal('b')
          })
        })
      })

      it("doesn't send x-requested-with if cross-domain", function () {
        return httpism.get(server + '/').then(function (body) {
          expect(body.xhr).to.equal(false)
        })
      })

      it('throws when it cannot connect to the remote server', function () {
        return httpism.get(badServer + '/').then(function () {
          throw new Error('expected to be rejected')
        }, function () {
        })
      })
    })
  })

  describe('post', function () {
    it('can make a json post request', function () {
      return httpism.post('/', {data: 'hehey'}, {response: true}).then(function (response) {
        expect(response.body.body).to.eql({data: 'hehey'})
        expect(response.body.headers['content-type']).to.equal('application/json')
        expect(response.headers['content-type']).to.equal('application/json; charset=utf-8')
        expect(response.url).to.equal('/')
      })
    })

    it('can make a cross-origin json post request', function () {
      return httpism.post(server + '/', {data: 'hehey'}, {response: true}).then(function (response) {
        expect(response.body.body).to.eql({data: 'hehey'})
        expect(response.body.headers['content-type']).to.equal('application/json')
        expect(response.headers['content-type']).to.equal('application/json; charset=utf-8')
        expect(response.url).to.equal(server + '/')
      })
    })

    it('can make a text post request', function () {
      return httpism.post('/', 'hehey', {response: true}).then(function (response) {
        expect(response.body.body).to.eql('hehey')
        expect(response.body.headers['content-type']).to.equal('text/plain;charset=UTF-8')
        expect(response.headers['content-type']).to.equal('application/json; charset=utf-8')
        expect(response.url).to.equal('/')
      })
    })

    it('can make a form post request', function () {
      return httpism.post('/', {message: 'hehey', to: 'bob'}, {response: true, form: true}).then(function (response) {
        expect(response.body.body).to.eql({message: 'hehey', to: 'bob'})
        expect(response.body.headers['content-type']).to.equal('application/x-www-form-urlencoded')
        expect(response.headers['content-type']).to.equal('application/json; charset=utf-8')
        expect(response.url).to.equal('/')
      })
    })

    it('can make a FormData request', function () {
      var data = new FormData()
      data.append('name', 'joe')
      data.append('file', new File(['file content'], 'file.txt', {type: 'text/plain'}))
      return httpism.post('/form', data).then(function (body) {
        expect(body).to.eql({
          name: 'joe',
          file: {
            contents: 'file content',
            headers: {
              'content-disposition': 'form-data; name="file"; filename="file.txt"',
              'content-type': 'text/plain'
            }
          }
        })
      })
    })
  })

  describe('put', function () {
    it('can make a json put request', function () {
      return httpism.put('/', {data: 'hehey'}, {response: true}).then(function (response) {
        expect(response.body.body).to.eql({data: 'hehey'})
        expect(response.body.headers['content-type']).to.equal('application/json')
        expect(response.headers['content-type']).to.equal('application/json; charset=utf-8')
        expect(response.url).to.equal('/')
      })
    })
  })

  describe('abort', function () {
    it('can abort a request', function () {
      var request = httpism.get('/')
      request.abort()
      return new Promise(function (resolve, reject) {
        request.then(function (response) {
          reject(new Error("didn't expect response"))
        }, function (error) {
          if (error.aborted !== true) {
            reject(error)
          } else {
            resolve()
          }
        })
      })
    })

    it('can abort a request even with user middleware', function () {
      var middlewareRequest, middlewareResponse

      var http = httpism.client([
        function (request, next) {
          middlewareRequest = true
          return next().then(function (response) {
            middlewareResponse = true
            return response
          })
        }
      ])

      var request = http.get('/')
      request.abort()
      return new Promise(function (resolve, reject) {
        request.then(function (response) {
          reject(new Error("didn't expect response"))
        }, function (error) {
          if (error.aborted !== true) {
            reject(error)
          } else {
            resolve()
          }
        })
      }).then(function () {
        expect(middlewareRequest).to.equal(true)
        expect(middlewareResponse).to.equal(undefined)
      })
    })
  })

  describe('x-requested-with header', function () {
    it('sends the x-requested-with header', function () {
      return httpism.get('/').then(function (body) {
        expect(body.xhr).to.equal(true)
      })
    })
  })

  describe('delete', function () {
    it('can respond with 204 and empty body', function () {
      return httpism.delete('/delete', {response: true}).then(function (response) {
        expect(response.statusCode).to.equal(204)
        expect(response.body).to.equal(undefined)
      })
    })
  })

  describe('jsonReviver', function () {
    it('uses the JSON reviver to decode JSON values', function () {
      return httpism.post('/', {
        greeting: 'hi'
      }, {
        jsonReviver: function (key, value) {
          if (key !== 'greeting') return value
          return value + '!'
        }
      }).then(function (body) {
        expect(body.body.greeting).to.equal('hi!')
      })
    })
  })

  describe('xhr option', function () {
    it('can override the XHR used in the request', function () {
      FakeXMLHttpRequest.prototype.onSend = function (xhr) {
        xhr.respond(200, {'Content-Type': 'text/plain'}, 'faked response')
      }
      return httpism.get('/', {xhr: FakeXMLHttpRequest}).then(function (body) {
        expect(body).to.equal('faked response')
      })
    })
  })

  describe('basic auth', function () {
    it('can specify basic authentication', function () {
      return httpism.get('/private', {basicAuth: {username: 'user', password: 'good'}}).then(function (body) {
        expect(body).to.equal('private')
      })
    })

    it('returns 401 when unauthorized', function () {
      return httpism.get('/private', {basicAuth: {username: 'user', password: 'bad'}, response: true, exceptions: false}).then(function (response) {
        expect(response.statusCode).to.equal(401)
      })
    })
  })
})
