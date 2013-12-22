httpism = require '../'
express = require 'express'

describe 'httpism'
    app = nil
    server = nil

    before
        app := express ()

        app.get '/' @(req, res)
            res.header 'content-type' 'application/json'
            res.send '{ "greeting": "hello" }'

        server := app.listen 12666

    after
        server.close ()

    describe 'getting a resource that responds with content-type application/json'

        it 'parses the response body'
            res = httpism.resource 'http://localhost:12666/'
            res := res.with response body parser 'application/json' (JSON.parse)
            root = res.get!
            root.body.greeting.should.equal "hello"
