request = require 'request'
url utils = require 'url'

Resource (agent, response, body) =
    this.agent = agent || request

    if (response)
        this.url = response.request.href
        this.body = body
        this.status code = response.status code
        this.headers = response.headers

    this

Resource.prototype = {

    resource (url, middleware) =
        resource = @new Resource (self.agent)
        resource.add middleware (middleware || [])
        resource.url = self.relative url (url)
        resource

    send (method, url, options, callback) =
        if (typeof(url) == 'object')
            options := url
            url := self.url

        opts = options || {}
        opts.method = method
        opts.url = self.relative url (url)
        self.agent (opts) @(err, response, body)
            if (err)
                callback(err)
            else
                callback(nil, @new Resource(self.agent, response, body))

    relative url (url) =
        if (self.url && url)
            url utils.resolve (self.url, url)
        else if (self.url)
            self.url
        else
            url

    add middleware (middleware) =
        for each @(wrapper) in (middleware)
            self.agent := wrapper (self.agent)

        self

    with middleware (middleware, ...) =
        self.resource(self.url, middleware)

    use (transform) =
        self.with middleware @(agent)
            send (options, cb) =
                transform (agent, options, cb)

    with request transform (transformer) =
        self.use @(agent, options, cb)
            transformer (options)
            agent (options, cb)

    with response transform (transformer) =
        self.use @(agent, options, cb)
            agent (options) @(err, response, body)
                transformer (err, response, body, cb)

    with response body parser (content type, parser) =
        self.with response transform @(err, response, body, cb)
            if (!err && (response.headers.'content-type' == content type))
                cb (err, response, parser (body))
            else
                cb (err, response, body)

    with json response body parser () =
        self.with response body parser 'application/json' (JSON.parse)

    with request body formatter (formatter) =
        self.with request transform @(options)
            if (typeof(options.body) != 'undefined')
                options.body = formatter (options.body)

    inspect () =
        if (self.status code)
            "[Response url=#(self.url), statusCode=#(self.status code)]"
        else
            "[Resource url=#(self.url)]"

}

sender (method) =
    send! (url, options) = this.send! (method, url, options)

for each @(method) in ['get', 'post', 'put', 'delete', 'patch', 'head', 'options']
    Resource.prototype.(method) = sender (method)

module.exports = @new Resource()
