httpism = require '../'
express = require 'express'

describe 'httpism'
    app = nil
    server = nil

    before
        app := express ()

        app.use @(req, res)
            res.send 200 (JSON.stringify {
                request method = req.method
                request headers = req.headers
            })

        server := app.listen 6666

    after
        server.close ()

    methods = ['get', 'put', 'post', 'delete', 'head', 'options', 'patch']

    for each @(method) in (methods)

        http verb = method.to upper case()

        describe (method)

            it "performs a #(http verb) request" @(done)

                fn = httpism.(method)
                fn.call (httpism, 'http://localhost:6666/') @(err, response, body)
                    if (err)
                        done (err)
                    else
                        response.body.should.exist
                        JSON.parse(response.body).request method.should.equal (http verb)
                        done()

        describe "httpism.resource(url, [middleware]).#(method)!"

            it "executes the middleware" @(done)

                middleware (request) =
                    intercept (options, cb) =
                        options.headers = { foo = 'bar' }
                        request (options, cb)

                resource = httpism.resource('http://localhost:6666/', [middleware])
                fn = resource.(method)
                fn.call (resource) @(err, response, body)
                    if (err)
                        done (err)
                    else
                        response.body.should.exist
                        JSON.parse(response.body).request headers.foo.should.equal 'bar'
                        done()
