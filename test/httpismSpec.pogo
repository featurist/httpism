httpism = require '../index.pogo'
express = require 'express'
bodyParser = require 'body-parser'
should = require 'chai'.should()
assert = require 'chai'.assert
https = require 'https'
fs = require 'fs'

describe 'httpism'
  server = nil
  app = nil
  port = 12345
  baseurl = "http://localhost:#(port)"

  beforeEach
    app := express()
    app.use(bodyParser.json())
    server := app.listen (port)

  afterEach
    server.close()

  itCanMake (method) requests =
    it "can make #(method) requests"
      app.(method.toLowerCase()) '/' @(req, res)
        res.send {method = req.method, path = req.path, accept = req.headers.accept}

      response = httpism.(method.toLowerCase()) (baseurl)!
      response.body.should.eql {method = method, path = '/', accept = 'application/json'}

  it "can make HEAD requests"
    app.head '/' @(req, res)
      res.header 'x-method' (req.method)
      res.header 'x-path' (req.path)
      res.end()

    response = httpism.head (baseurl)!
    response.headers.'x-method'.should.equal 'HEAD'
    response.headers.'x-path'.should.equal '/'

  itCanMake (method) requestsWithBody =
    it "can make #(method) requests"
      app.(method.toLowerCase()) '/' @(req, res)
        res.send {method = req.method, path = req.path, accept = req.headers.accept, body = req.body}

      response = httpism.(method.toLowerCase()) (baseurl, { joke = 'a chicken...' })!
      response.body.should.eql {method = method, path = '/', accept = 'application/json', body = { joke = 'a chicken...' }}

  itCanMake 'GET' requests
  itCanMake 'DELETE' requests
  itCanMake 'POST' requestsWithBody
  itCanMake 'PUT' requestsWithBody
  itCanMake 'PATCH' requestsWithBody
  itCanMake 'OPTIONS' requestsWithBody

  describe 'request headers'
    it 'can accept new headers for the request'
      app.get '/' @(req, res)
        res.send {'x-header' = req.headers.'x-header'}

      response = httpism.get (baseurl, headers: {'x-header' = 'haha'})!
      response.body.'x-header'.should.equal 'haha'

  describe 'text responses'
    itReturnsAStringForContentType (mimeType) =
      it "returns a string if the content-type is #(mimeType)"
        app.get '/' @(req, res)
          res.header 'content-type' (mimeType)
          res.send 'content as string'

        response = httpism.get (baseurl)!
        response.body.should.equal 'content as string'

    itReturnsAStringForContentType 'text/plain'
    itReturnsAStringForContentType 'text/html'
    itReturnsAStringForContentType 'text/css'
    itReturnsAStringForContentType 'text/javascript'
    itReturnsAStringForContentType 'application/javascript'

  describe 'apis'
    it 'can make a new client that adds headers'
      app.get '/' @(req, res)
        res.send {joke = req.headers.joke}

      client = httpism.api @(request, next)
        request.headers.joke = 'a chicken...'
        next (request)!

      response = client.get (baseurl)!

      response.body.should.eql {joke = 'a chicken...'}

  describe 'exceptions'
    beforeEach
      app.get '/400' @(req, res)
        res.send 400 {message = 'oh dear'}

    it 'throws exceptions on 400-500 status codes, by default'
      try
        httpism.api (baseurl).get '/400'!
        assert.fail 'expected an exception to be thrown'
      catch (e)
        e.message.should.equal "GET #(baseurl)/400 => 400 Bad Request"
        e.statusCode.should.equal 400
        e.body.message.should.equal 'oh dear'

    it "doesn't throw exceptions on 400-500 status codes, when specified"
      response = httpism.api (baseurl).get ('/400', exceptions: false)!
      response.body.message.should.equal 'oh dear'

  describe 'options'
    client = nil
    beforeEach
      client := httpism.api @(request, next)
        request.body = request.options
        next (request)!
      (a: 'a')

      app.post '/' @(req, res)
        res.send (req.body)

    it 'clients have options, which can be overwritten on each request'
      root = client.api (baseurl)
      response = root.post '' (nil, b: 'b')!
      response.body.should.eql {a = 'a', b = 'b'}
      response.post '' (nil, c: 'c')!.body.should.eql {a = 'a', c = 'c'}
      root.post '' (nil)!.body.should.eql {a = 'a'}

  describe 'responses act as clients'
    path = nil

    beforeEach
      pathResponse (req, res) =
        res.send {path = req.path}

      app.get '/' (pathResponse)
      app.get '/rootfile' (pathResponse)
      app.get '/path/' (pathResponse)
      app.get '/path/file' (pathResponse)

      api = httpism.api (baseurl)
      path := api.get '/path/'!

    it 'resources respond with their url'
      path.url.should.equal "#(baseurl)/path/"
      path.body.path.should.equal '/path/'

    it "addresses original resource if url is ''"
      path.get ''!.body.path.should.equal '/path/'

    it 'makes relative sub path'
      path.get 'file'!.body.path.should.equal '/path/file'

    it 'addresses root'
      path.get '/'!.body.path.should.equal '/'

    it 'can address ../ paths'
      path.get '../rootfile'!.body.path.should.equal '/rootfile'

    it 'can create new apis from relative paths'
      path.api 'file'.get ''!.body.path.should.equal '/path/file'

  describe 'redirects'
    beforeEach
      app.get '/redirecttoredirect' @(req, res)
        res.redirect '/redirect'

      app.get '/redirect' @(req, res)
        res.location '/path/'
        res.send(302, {path = req.path})

      app.get '/' @(req, res)
        res.send {path = req.path}

      app.get '/path/' @(req, res)
        res.send {path = req.path}

      app.get '/path/file' @(req, res)
        res.send {path = req.path}

    it 'follows redirects by default'
      response = httpism.get "#(baseurl)/redirect"!
      response.body.should.eql {path = '/path/'}
      response.url.should.eql "#(baseurl)/path/"

    itFollows (statusCode) redirects =
      it "follows #(statusCode) redirects"
        app.get "/#(statusCode)" @(req, res)
          res.location '/path/'
          res.send(statusCode)

        response = httpism.get "#(baseurl)/#(statusCode)"!
        response.body.should.eql {path = '/path/'}
        response.url.should.eql "#(baseurl)/path/"

    describe 'redirects'
      itFollows 300 redirects
      itFollows 301 redirects
      itFollows 302 redirects
      itFollows 303 redirects
      itFollows 307 redirects

    it 'paths are relative to destination resource'
      response = httpism.get "#(baseurl)/redirect"!
      response.get 'file'!.body.path.should.equal '/path/file'

    it 'follows a more than one redirect'
      response = httpism.get "#(baseurl)/redirecttoredirect"!
      response.body.should.eql {path = '/path/'}
      response.url.should.eql "#(baseurl)/path/"

    it "doesn't follow redirects when specified"
      response = httpism.get "#(baseurl)/redirect" (redirect: false)!
      response.body.should.eql {path = '/redirect'}
      response.url.should.eql "#(baseurl)/redirect"
      response.headers.location.should.equal '/path/'
      response.statusCode.should.equal 302

  describe 'https'
    httpsServer = nil
    httpsPort = 23456
    httpsBaseurl = "https://localhost:#(httpsPort)/"

    beforeEach
      credentials = {
        key = fs.readFileSync "#(__dirname)/server.key" 'utf-8'
        cert = fs.readFileSync "#(__dirname)/server.crt" 'utf-8'
      }

      httpsServer := https.createServer (credentials, app)
      httpsServer.listen (httpsPort)

    afterEach
      httpsServer.close()

    it 'can make HTTPS requests' =>
      app.get '/' @(req, res)
        res.send { protocol = req.protocol }

      httpism.get (httpsBaseurl, https: {rejectUnauthorized = false})!.body.protocol.should.equal 'https'
