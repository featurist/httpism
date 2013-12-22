httpism = require '../'
express = require 'express'

describe 'httpism, with middleware'
    app = nil
    server = nil
    count = 0

    before each @{ count := 0 }

    before
        app := express ()

        app.get '/' @(req, res)
            count := count + 1
            res.header 'content-type' 'text/plain'
            res.send "response #(count)"

        server := app.listen 12345

    after
        server.close ()

    describe 'get, with a list of middleware'
        it 'applies each middleware in turn'
            appender (char) =
                middleware (request) =
                    append (options, cb) =
                        request (options) @(err, response, body)
                            cb(err, response, body + char)

            list = [appender 'x', appender 'y', appender 'z']
            resource = httpism.resource 'http://localhost:12345/' (list)
            first  = resource.get!
            second = resource.get!
            first.body.should.equal "response 1xyz"
            second.body.should.equal "response 2xyz"

    describe 'get, with vcr middleware'
        it 'gets the resource once, then gets the cached resource'
            vcr = require './vcr'.vcr
            resource = httpism.resource 'http://localhost:12345/' [vcr]
            first  = resource.get!
            second = resource.get!
            first.body.should.equal "response 1"
            second.body.should.equal "response 1"

    describe 'get, with vcr middleware added later'
        it 'gets the resource once, then gets the cached resource'
            vcr = require './vcr'.vcr
            resource = httpism.resource 'http://localhost:12345/'.with middleware (vcr)
            first  = resource.get!
            second = resource.get!
            first.body.should.equal "response 1"
            second.body.should.equal "response 1"
