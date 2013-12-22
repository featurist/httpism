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
            middleware (request) =
                send (options, cb) =
                    request (options) @(err, response, body)
                        if (response.headers.'content-type' == 'application/json')
                            cb (err, response, JSON.parse (body))
                        else
                            cb (err, response, body)

            res = httpism.resource 'http://localhost:12666/' [middleware]
            root = res.get!
            root.body.greeting.should.equal "hello"
