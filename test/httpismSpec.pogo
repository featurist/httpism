httpism = require '../index'
express = require 'express'
bodyParser = require 'body-parser'
should = require 'chai'.should()
assert = require 'chai'.assert
https = require 'https'
fs = require 'fs'
qs = require 'qs'
middleware = require '../middleware'
basicAuth = require 'basic-auth-connect'

describe 'httpism'
  server = nil
  app = nil
  port = 12345
  baseurl = "http://localhost:#(port)"

  beforeEach
    app := express()
    server := app.listen (port)

  afterEach
    server.close()

  describe 'json'
    beforeEach
      app.use(bodyParser.json())

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
      it "can make #(method) requests with body"
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

    describe 'content type request header'
      beforeEach
        app.post '/' @(req, res)
          res.header 'received-content-type' (req.headers.'content-type')
          res.header 'content-type' 'text/plain'
          req.pipe(res)

      it 'can upload JSON as application/custom'
        response = httpism.post (baseurl) { json = 'json' } (headers: { 'content-type' = 'application/custom' })!
        JSON.parse (response.body).should.eql { json = 'json' }
        response.headers.'received-content-type'.should.eql 'application/custom'

      it 'can upload form as application/custom'
        response = httpism.post (baseurl) { json = 'json' } (form: true, headers: { 'content-type' = 'application/custom' })!
        qs.parse (response.body).should.eql { json = 'json' }
        response.headers.'received-content-type'.should.eql 'application/custom'

      it 'can upload string as application/custom'
        response = httpism.post (baseurl) 'a string' (headers: { 'content-type' = 'application/custom' })!
        response.body.should.eql 'a string'
        response.headers.'received-content-type'.should.eql 'application/custom'

    describe 'content-length header'
      unicodeText = '♫♫♫♫♪ ☺'

      beforeEach
        app.post '/' @(req, res)
          res.send {
            'content-length' = req.headers.'content-length'
            'transfer-encoding' = req.headers.'transfer-encoding'
          }


      it 'sends content-length, and not transfer-encoding: chunked, with JSON'
        response = httpism.post (baseurl) { json = unicodeText }!
        response.body.should.eql {
          'content-length' = Buffer.byteLength(JSON.stringify { json = unicodeText }).toString()
        }

      it 'sends content-length, and not transfer-encoding: chunked, with plain text'
        response = httpism.post (baseurl, unicodeText)!
        response.body.should.eql {
          'content-length' = Buffer.byteLength(unicodeText).toString()
        }

      it 'sends content-length, and not transfer-encoding: chunked, with form data'
        response = httpism.post (baseurl, { formData = unicodeText }, form: true)!
        response.body.should.eql {
          'content-length' = Buffer.byteLength(qs.stringify { formData = unicodeText }).toString()
        }

    describe 'accept request header'
      beforeEach
        app.get '/' @(req, res)
          res.header 'content-type' 'text/plain'
          res.send (req.headers.accept)

      it 'sends Accept: application/json by default'
        response = httpism.get (baseurl)!
        response.body.should.eql 'application/json'

      it 'can send a custom Accept header'
        response = httpism.get (baseurl, headers: {accept = 'application/custom'})!
        response.body.should.eql 'application/custom'

    describe 'request headers'
      it 'can specify headers for the request'
        app.get '/' @(req, res)
          res.send {'x-header' = req.headers.'x-header'}

        response = httpism.get (baseurl, headers: {'x-header' = 'haha'})!
        response.body.'x-header'.should.equal 'haha'

    describe 'text'
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

      it 'will upload a string as text/plain'
        app.post '/text' @(req, res)
          res.header 'received-content-type' (req.headers.'content-type')
          res.header 'content-type' 'text/plain'
          req.pipe(res)

        response = httpism.post "#(baseurl)/text" 'content as string'!
        response.headers.'received-content-type'.should.equal 'text/plain'
        response.body.should.equal 'content as string'

    describe 'query strings'
      beforeEach
        app.get '/' @(req, res)
          res.send(req.query)

      it 'can set query string'
        response = httpism.get (baseurl, querystring = {a = 'a', b = 'b'}, log = true)!
        response.body.should.eql {a = 'a', b = 'b'}

      it 'can override query string in url'
        response = httpism.get ("#(baseurl)/?a=a&c=c", querystring: {a = 'newa', b = 'b'})!
        response.body.should.eql {a = 'newa', b = 'b', c = 'c'}

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
          res.status 400.send {message = 'oh dear'}

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
          res.status 302.send {path = req.path}

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
            res.status (statusCode).send()

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

    describe 'forms'
      it 'can upload application/x-www-form-urlencoded'
        app.post '/form' @(req, res)
          res.header 'content-type' 'text/plain'
          res.header 'received-content-type' (req.headers.'content-type')
          req.pipe(res)

        response = httpism.post "#(baseurl)/form" {name = 'Betty Boo', address = 'one & two'} (form: true)!
        response.body.should.equal 'name=Betty%20Boo&address=one%20%26%20two'
        response.headers.'received-content-type'.should.equal 'application/x-www-form-urlencoded'

      it 'can download application/x-www-form-urlencoded'
        app.get '/form' @(req, res)
          res.header 'content-type' 'application/x-www-form-urlencoded'
          res.send (qs.stringify {name = 'Betty Boo', address = 'one & two'})

        response = httpism.get "#(baseurl)/form"!
        response.body.should.eql {name = 'Betty Boo', address = 'one & two'}
        response.headers.'content-type'.should.equal 'application/x-www-form-urlencoded; charset=utf-8'

    describe 'basic authentication'
      beforeEach
        app.use(basicAuth @(user, pass)
          user == 'good user' @and pass == 'good password!'
        )

        app.get '/secret' @(req, res)
          res.send 'this is secret'

      it 'can authenticate using username password'
        httpism.get "#(baseurl)/secret" (basicAuth: {username = 'good user', password = 'good password!'})!.body.should.equal 'this is secret'

      it 'can authenticate using username password encoded in URL'
        u = encodeURIComponent
        httpism.get "http://#(u 'good user'):#(u 'good password!')@localhost:#(port)/secret"!.body.should.equal 'this is secret'

      it 'can authenticate using username with colons :'
        httpism.get "#(baseurl)/secret" (basicAuth: {username = 'good: :user', password = 'good password!'})!.body.should.equal 'this is secret'

      it 'fails to authenticate when password is incorrect'
        httpism.get "#(baseurl)/secret" (basicAuth: {username = 'good user', password = 'bad password!'}, exceptions: false)!.statusCode.should.equal 401

  describe 'streams'
    filename = "#(__dirname)/afile.txt"

    beforeEach
      fs.writeFile (filename, 'some content', ^)!

      app.post '/file' @(req, res)
        res.header 'content-type' 'text/plain'
        res.header 'received-content-type' (req.headers.'content-type')
        req.unshift 'received: '
        req.pipe(res)

      app.get '/file' @(req, res)
        stream = fs.createReadStream (filename)
        res.header 'content-type' 'application/blah'
        stream.pipe(res)

    afterEach
      fs.unlink (filename, ^)!

    itCanUploadAStreamWithContentType (contentType) =
      it "can upload a stream with Content-Type: #(contentType)"
        stream = fs.createReadStream (filename)
        response = httpism.post "#(baseurl)/file" (stream, headers: {'content-type' = contentType})!
        response.headers.'received-content-type'.should.equal (contentType)
        response.body.should.equal 'received: some content'

    itCanUploadAStreamWithContentType 'application/blah'
    itCanUploadAStreamWithContentType 'application/json'
    itCanUploadAStreamWithContentType 'text/plain'
    itCanUploadAStreamWithContentType 'application/x-www-form-urlencoded'

    it 'can download a stream'
      response = httpism.get "#(baseurl)/file"!
      response.headers.'content-type'.should.equal 'application/blah'
      middleware.stream (response.body) toString!.should.equal 'some content'

    describe 'forcing response parsing'
      describeForcing (type) response (contentType: nil, content: nil, sendContent: nil) =
        describe (type)
          it "can download a stream of content-type #(contentType)"
            app.get '/content' @(req, res)
              stream = fs.createReadStream (filename)
              res.header 'content-type' (contentType)
              stream.pipe(res)

            response = httpism.get "#(baseurl)/content" (responseBody: 'stream')!
            response.headers.'content-type'.should.equal (contentType)
            middleware.stream (response.body) toString!.should.equal 'some content'

          it "can force parse #(type) when content-type is application/blah"
            app.get '/content' @(req, res)
              res.header 'content-type' 'application/blah'
              res.send (sendContent @or content)

            response = httpism.get "#(baseurl)/content" (responseBody: (type))!
            response.headers.'content-type'.should.equal 'application/blah; charset=utf-8'
            response.body.should.eql (content)

      describeForcing 'text' response (contentType: 'text/plain; charset=utf-8', content: 'some text content')
      describeForcing 'json' response (contentType: 'application/json', content: { json = true})
      describeForcing 'form' response (contentType: 'application/x-www-form-urlencoded', content: { json = "true"}, sendContent: qs.stringify { json = "true" })

  describe 'raw'
    it 'can be used to create new middleware pipelines'
      app.get "/" @(req, res)
        res.status 400.send {blah = 'blah'}

      api = httpism.raw.api (baseurl) @(request, next)
        res = next()!
        res.body = middleware.stream (res.body) toString!
        res

      response = api.get (baseurl)!
      response.statusCode.should.equal 400
      JSON.parse (response.body).should.eql {blah = 'blah'}
