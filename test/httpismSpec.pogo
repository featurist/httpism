httpism = require '../'
express = require 'express'

describe 'httpism'
    app = nil
    server = nil

    before
        app := express ()

        app.use(express.body parser ())

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
            console.log (req.body)
            res.send 201 "posted #(req.body)"

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

    describe 'resource'
        it 'returns a resource without making a request'
            resource = httpism.resource 'http://localhost:12345/nothinghere'
            resource.url.should.equal 'http://localhost:12345/nothinghere'

        it 'can be used to GET things'
            resource = httpism.resource 'http://localhost:12345/nothinghere'
            resource.url.should.equal 'http://localhost:12345/nothinghere'
            asdf = resource.get! 'asdf'
            asdf.url.should.equal 'http://localhost:12345/asdf'
            asdf.body.should.equal 'asdf'
