httpism = require '../'
express = require 'express'

describe 'httpism'
    app = nil
    server = nil

    before
        app := express ()

        app.get '/int' @(req, res)
            res.header 'content-type' 'application/integer'
            res.send '123'

        app.get '/json' @(req, res)
            res.header 'content-type' 'application/json'
            res.send '{ "greeting": "hello" }'

        server := app.listen 12666

    after
        server.close ()

    describe 'parsing an integer response with a custom body parser'

        it 'parses the response body'
            res = httpism.resource 'http://localhost:12666/'
            res := res.with response body parser 'application/integer' (Number)
            root = res.get! 'int'
            root.body.should.equal 123
