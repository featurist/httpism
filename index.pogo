request = require 'request'
url utils = require 'url'

resource = {
    get!(url, headers: {}) =
        absolute url = (url) relative to (self.url)
        response = request!(absolute url)
        create resource (response)

    post!(url, body, headers: {}) = nil
    delete!(url, headers: {}) = nil
    put!(url, body, headers: {}) = nil
    head!(url, headers: {}) = nil
    options!(url, headers: {}) = nil
}

(url) relative to (base url) =
    if (base url && url)
        url utils.resolve (base url, url)
    else if (base url)
        base url
    else
        url

create resource (response) =
    resource = Object.create (resource)
    
    if (response)
        for each @(field) in ['body', 'statusCode', 'headers']
            resource.(field) = response.(field)

        resource.url = response.request.href

    resource

for @(field) in (resource)
    exports.(field) = resource.(field)

exports.resource (url) =
    resource = create resource ()
    resource.url = url
    resource
