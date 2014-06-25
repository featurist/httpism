request = require 'request'
needle = require 'needle'
urlUtils = require 'url'

sendUsingNeedle (options, callback) =
    if (typeof (options.follow) != 'undefined')
        options.follow = true

    console.log (options)

    needle.request (options.method, options.url, options.body, options, callback)

Resource (agent, url, response, body) =
    this.agent = agent || sendUsingNeedle
    this.url = url

    if (response)
        this.body = body
        this.statusCode = response.statusCode
        this.headers = response.headers

    this

Resource.prototype = {

    resource (url, middleware) =
        resource = @new Resource (self.agent, self.relativeUrl (url))
        resource.addMiddleware (middleware || [])
        resource

    send (method, url, options, callback) =
        if (typeof(url) == 'object')
            options := url
            url := self.url

        opts = options || {}
        opts.method = method
        opts.url = self.relativeUrl (url)
        self.agent (opts) @(err, response, body)
            console.log (response.url)
            if (err)
                callback (err)
            else
                callback (nil, @new Resource(self.agent, opts.url, response, body))

    relativeUrl (url) =
        if (self.url && url)
            urlUtils.resolve (self.url, url)
        else if (self.url)
            self.url
        else
            url

    addMiddleware (middleware) =
        for each @(wrapper) in (middleware)
            self.agent := wrapper (self.agent)

        self

    withMiddleware (middleware, ...) =
        self.resource(self.url, middleware)

    use (transform) =
        self.withMiddleware @(agent)
            send (options, cb) =
                transform (agent, options, cb)

    withRequestTransform (transformer) =
        self.use @(agent, options, cb)
            transformer (options)
            agent (options, cb)

    withResponseTransform (transformer) =
        self.use @(agent, options, cb)
            agent (options) @(err, response, body)
                transformer (err, response, body, cb)

    withResponseBodyParser (contentType, parser) =
        self.withResponseTransform @(err, response, body, cb)
            if (!err @and (response.headers.'content-type' == contentType))
                cb (err, response, parser (body))
            else
                cb (err, response, body)

    withRequestBodyFormatter (formatter) =
        self.withRequestTransform @(options)
            if (typeof(options.body) != 'undefined')
                options.body = formatter (options.body)

    inspect () =
        if (self.statusCode)
            "[Response url=#(self.url), statusCode=#(self.statusCode)]"
        else
            "[Resource url=#(self.url)]"

}

sender (method) =
    send! (url, options) = this.send! (method, url, options)

for each @(method) in ['get', 'post', 'put', 'delete', 'patch', 'head', 'options']
    Resource.prototype.(method) = sender (method)

module.exports = @new Resource()
