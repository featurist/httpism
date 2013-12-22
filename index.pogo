request = require 'request'
url utils = require 'url'

Resource (requester) =
    this.requester = requester || request
    this

Resource.prototype = {

    get!     (url, options) = self.send! 'get'     (url, options)
    post!    (url, options) = self.send! 'post'    (url, options)
    put!     (url, options) = self.send! 'put'     (url, options)
    delete!  (url, options) = self.send! 'delete'  (url, options)
    head!    (url, options) = self.send! 'head'    (url, options)
    options! (url, options) = self.send! 'options' (url, options)

    resource (url, middleware) =
        requester = make requester from (middleware || [])
        resource = create resource (requester)
        resource.url = url
        resource

    send (method, url, options, callback) =
        opts = options || {}
        opts.method = method
        opts.url = self.relative url (url)
        self.requester (opts) @(err, response, body)
            if (err)
                callback(err)
            else
                callback(nil, create resource (self.requester, response, body))

    relative url (url) =
        if (self.url && url)
            url utils.resolve (self.url, url)
        else if (self.url)
            self.url
        else
            url

    with middleware (middleware, ...) =
        self.resource(self.url, middleware)

}

create resource (requester, response, body) =
    resource = @new Resource(requester)

    if (response)
        for each @(field) in ['body', 'statusCode', 'headers']
            resource.(field) = response.(field)

        resource.url = response.request.href
        resource.body = body

    resource

make requester from (middleware) =
    requester = request
    for each @(wrapper) in (middleware)
        requester := wrapper (requester)

    requester

module.exports = @new Resource()
