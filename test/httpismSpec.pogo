httpism = require '../index.pogo'
express = require 'express'
bodyParser = require 'body-parser'
require 'chai'.should()

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

  context 'a server that responds with JSON to GET requests'
    beforeEach
      app.get '/' @(req, res)
        res.send {method = req.method, path = req.path}

    it 'can make GET requests'
      response = httpism.json.get (baseurl)!

      response.body.should.eql {method = 'GET', path = '/'}

  context 'a server that responds to JSON POST requests'
    beforeEach
      app.use(bodyParser.json())
      app.post '/' @(req, res)
        res.send {method = req.method, path = req.path, body = req.body}

    it 'can make JSON POST requests'
      response = httpism.json.post (baseurl, { joke = 'a chicken...' })!

      response.body.should.eql {method = 'POST', path = '/', body = { joke = 'a chicken...' }}

  context 'a server that responds to JSON PUT requests'
    beforeEach
      app.use(bodyParser.json())
      app.put '/' @(req, res)
        res.send {method = req.method, path = req.path, body = req.body}

    it 'can make JSON PUT requests'
      response = httpism.json.put (baseurl, { joke = 'a chicken...' })!

      response.body.should.eql {method = 'PUT', path = '/', body = { joke = 'a chicken...' }}

  context 'a server that returns headers on GET'
    beforeEach
      app.get '/' @(req, res)
        res.send {joke = req.headers.joke}

    it 'can make a new client that adds headers'
      client = httpism.json.client @(request, next)
        request.headers.joke = 'a chicken...'
        next (request)!

      response = client.get (baseurl)!

      response.body.should.eql {joke = 'a chicken...'}

  describe 'responses act as clients'
    context 'server with resources'
      beforeEach
        pathResponse (req, res) =
          res.send {path = req.path}
          
        app.get '/' (pathResponse)
        app.get '/rootfile' (pathResponse)
        app.get '/path/' (pathResponse)
        app.get '/path/file' (pathResponse)

      it 'all subsequent requests are relative to original'
        api = httpism.json.resource (baseurl)
        path = api.get '/path/'!

        path.body.path.should.equal '/path/'
        path.get ''!.body.path.should.equal '/path/'
        path.get 'file'!.body.path.should.equal '/path/file'
        path.get '/'!.body.path.should.equal '/'
        path.get '../rootfile'!.body.path.should.equal '/rootfile'
