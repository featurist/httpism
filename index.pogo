request = require 'request'
url utils = require 'url'

Resource (requester) =
    this.requester = requester
    this

Resource.prototype = {
    get!     (url, options) = self.send! 'get'     (url, options)
    post!    (url, options) = self.send! 'post'    (url, options)
    put!     (url, options) = self.send! 'put'     (url, options)
    delete!  (url, options) = self.send! 'delete'  (url, options)
    head!    (url, options) = self.send! 'head'    (url, options)
    options! (url, options) = self.send! 'options' (url, options)

    send (method, url, options, callback) =
        opts = options || {}
        opts.method = method
        opts.url = (url) relative to (self.url)
        requester = self.requester || request
        requester (opts) @(err, response, body)
            if (err)
                callback(err)
            else
                callback(nil, create resource (requester, response, body))

    with middleware (middleware, ...) =
        exports.resource(self.url, middleware)
}

(url) relative to (base url) =
    if (base url && url)
        url utils.resolve (base url, url)
    else if (base url)
        base url
    else
        url

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

for @(member) in (Resource.prototype)
    exports.(member) = Resource.prototype.(member)

exports.resource (url, middleware) =
    requester = make requester from (middleware || [])
    resource = create resource (requester)
    resource.url = url
    resource
