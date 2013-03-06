request = require 'request'
url utils = require 'url'

interface = {
    get!     (url, options) = self.send! 'get'     (url, options)
    post!    (url, options) = self.send! 'post'    (url, options)
    put!     (url, options) = self.send! 'put'     (url, options)
    delete!  (url, options) = self.send! 'delete'  (url, options)
    head!    (url, options) = self.send! 'head'    (url, options)
    options! (url, options) = self.send! 'options' (url, options)    
        
    send (verb, url, options, callback) =
        opts = options || {}
        opts.method = verb
        opts.url = (url) relative to (self.url)
        request (opts) @(err, response, body)
            callback(err, err || create resource (response, body))
}

(url) relative to (base url) =
    if (base url && url)
        url utils.resolve (base url, url)
    else if (base url)
        base url
    else
        url

create resource (response, body) =
    resource = Object.create (interface)
    
    if (response)
        for each @(field) in ['body', 'statusCode', 'headers']
            resource.(field) = response.(field)

        resource.url = response.request.href
        resource.body = body

    resource

for @(member) in (interface)
    exports.(member) = interface.(member)

exports.resource (url) =
    resource = create resource ()
    resource.url = url
    resource
