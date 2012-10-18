httpism = require '../'
express = require 'express'

describe 'httpism'
    describe 'get'
        app = nil
        server = nil

        before
            app = express ()
            app.get '/' @(req, res)
                res.header 'content-type' 'text/plain'
                res.end 'hi'

            app.get '/asdf' @(req, res)
                res.header 'content-type' 'text/plain'
                res.end 'asdf'

            app.get '/redirect' @(req, res)
                res.redirect '/root/'

            app.get '/root/' @(req, res)
                res.header 'content-type' 'text/plain'
                res.end 'redirected root'

            app.get '/root/asdf' @(req, res)
                res.header 'content-type' 'text/plain'
                res.end 'redirected asdf'

            server = app.listen 12345

        after
            server.close ()

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
