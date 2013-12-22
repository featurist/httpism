request = require 'request'
url utils = require 'url'

Resource (requester, response, body) =
    this.requester = requester || request
    if (response)
        for each @(field) in ['body', 'statusCode', 'headers']
            this.(field) = response.(field)

        this.url = response.request.href
        this.body = body

    this

Resource.prototype = {

    get!     (url, options) = self.send! 'get'     (url, options)
    post!    (url, options) = self.send! 'post'    (url, options)
    put!     (url, options) = self.send! 'put'     (url, options)
    delete!  (url, options) = self.send! 'delete'  (url, options)
    head!    (url, options) = self.send! 'head'    (url, options)
    options! (url, options) = self.send! 'options' (url, options)

    resource (url, middleware) =
        resource = @new Resource ()
        resource.add middleware (middleware || [])
        resource.url = self.relative url (url)
        resource

    send (method, url, options, callback) =
        opts = options || {}
        opts.method = method
        opts.url = self.relative url (url)
        self.requester (opts) @(err, response, body)
            if (err)
                callback(err)
            else
                callback(nil, @new Resource (self.requester, response, body))

    relative url (url) =
        if (self.url && url)
            url utils.resolve (self.url, url)
        else if (self.url)
            self.url
        else
            url

    with middleware (middleware, ...) =
        self.resource(self.url, middleware)

    add middleware (middleware) =
        for each @(wrapper) in (middleware)
            self.requester := wrapper (self.requester)

        self

}

module.exports = @new Resource()
