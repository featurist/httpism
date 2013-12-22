httpism = require '../'
express = require 'express'

describe 'httpism'
    app = nil
    server = nil
    bodies = []

    before
        app := express ()

        app.use @(req, res, next)
            data = ''
            req.set encoding 'utf8'
            req.on 'data' @(chunk) @{ data := data + chunk }
            req.on 'end'
                bodies.push (data)
                next()

        server := app.listen 12667

    after
        server.close ()

    describe 'posting a json resource with a custom body formatter'

        it 'formats the request body as a string'
            res = httpism.resource 'http://localhost:12667/'
            number printer (num) = Number(num).to string()
            res := res.with request body formatter (number printer)
            root = res.post! '/' { body = 123 }
            bodies.should.eql ['123']
