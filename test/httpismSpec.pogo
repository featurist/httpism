httpism = require '../'
express = require 'express'

describe 'httpism'
    app = nil
    server = nil

    before
        app := express ()

        app.use @(req, res, next)
            data = ''
            req.set encoding 'utf8'
            req.on 'data' @(chunk) @{ data := data + chunk }
            req.on 'end'
                req.body = data
                next()

        app.get '/' @(req, res)
            res.header 'content-type' 'text/plain'
            res.send 'hi'

        app.get '/asdf' @(req, res)
            res.header 'content-type' 'text/plain'
            res.send 'asdf'

        app.get '/redirect' @(req, res)
            res.redirect '/root/'

        app.get '/root/' @(req, res)
            res.header 'content-type' 'text/plain'
            res.send 'redirected root'

        app.get '/root/asdf' @(req, res)
            res.header 'content-type' 'text/plain'
            res.send 'redirected asdf'

        app.post '/post' @(req, res)
            res.header 'content-type' 'text/plain'
            res.send 201 "posted #(req.body)"

        app.post '/json' @(req, res)
            res.header 'content-type' 'application/json'
            res.send 200 (JSON.stringify({ posted = JSON.parse(req.body) }))

        app.put '/put' @(req, res)
            res.header 'content-type' 'text/plain'
            res.send 200 "putted #(req.body)"

        server := app.listen 12345

    after
        server.close ()

    describe 'get'
        it 'can get a resource'
            root = httpism.get! 'http://localhost:12345/'
            root.url.should == 'http://localhost:12345/'
            root.status code.should.equal 200
            root.body.should.equal 'hi'
            root.headers.'content-type'.should.equal 'text/plain'

        it 'can get a relative resource'
            root = httpism.get! 'http://localhost:12345/'
            asdf = root.get! 'asdf'
            asdf.url.should == 'http://localhost:12345/asdf'
            asdf.status code.should.equal 200
            asdf.body.should.equal 'asdf'
            asdf.headers.'content-type'.should.equal 'text/plain'

        it 'follows redirects'
            redirected = httpism.get! 'http://localhost:12345/redirect'
            redirected.url.should == 'http://localhost:12345/root/'
            asdf = redirected.get! 'asdf'
            asdf.url.should == 'http://localhost:12345/root/asdf'
            asdf.status code.should.equal 200
            asdf.body.should.equal 'redirected asdf'
            asdf.headers.'content-type'.should.equal 'text/plain'

    describe 'post'
        it 'can post a resource'
            root = httpism.post! 'http://localhost:12345/post' { body = 'zomg' }
            root.url.should == 'http://localhost:12345/'
            root.status code.should.equal 201
            root.body.should.equal 'posted zomg'
            root.headers.'content-type'.should.equal 'text/plain'

    describe 'put'
        it 'can put a resource'
            root = httpism.put! 'http://localhost:12345/put' { body = 'gosh' }
            root.url.should == 'http://localhost:12345/'
            root.status code.should.equal 200
            root.body.should.equal 'putted gosh'
            root.headers.'content-type'.should.equal 'text/plain'

    describe 'resource'
        it 'returns a resource without making a request'
            resource = httpism.resource 'http://localhost:12345/nothinghere'
            resource.url.should.equal 'http://localhost:12345/nothinghere'

        it 'can be used to GET things with a path'
            resource = httpism.resource 'http://localhost:12345/nothinghere'
            resource.url.should.equal 'http://localhost:12345/nothinghere'
            asdf = resource.get! 'asdf'
            asdf.url.should.equal 'http://localhost:12345/asdf'
            asdf.body.should.equal 'asdf'

        it 'can be used to POST things with a path and other custom request options'
            resource = httpism.resource 'http://localhost:12345/'
            asdf = resource.post! 'post' { body = 'zomg' }
            asdf.url.should.equal 'http://localhost:12345/post'
            asdf.body.should.equal 'posted zomg'

        it 'can be used to POST things without a path, but other custom request options'
            resource = httpism.resource 'http://localhost:12345/post'
            asdf = resource.post! { body = 'zomg' }
            asdf.url.should.equal 'http://localhost:12345/post'
            asdf.body.should.equal 'posted zomg'

        it 'can be used to POST JSON'
            resource = httpism.resource 'http://localhost:12345/json'
            resource := resource.with request body formatter (JSON.stringify)
            resource := resource.with response body parser ('application/json', JSON.parse)
            response = resource.post! { body = { foo = 'bar' } }
            response.url.should.equal 'http://localhost:12345/json'
            response.body.should.eql { posted = { foo = "bar" }}

        describe '.resource (chaining)'
            resource = httpism.resource 'http://localhost:12345/'.resource 'nothinghere'
            resource.url.should.equal 'http://localhost:12345/nothinghere'
