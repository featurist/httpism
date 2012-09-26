request = require 'request'
url utils = require 'url'

(url) relative to (base url) =
    if (base url && url)
        url utils.resolve (base url, url)
    else if (base url)
        base url
    else
        url

module.exports (base url, response) =
    resource = {
        get! (url) =
            if (url :: Function)
                self.get (nil, url)
                return

            full url = (url) relative to (base url)
            module.exports (full url, request! (full url))

        url = base url
    }

    if (response)
        for each @(field) in ['body', 'statusCode', 'headers']
            resource.(field) = response.(field)

    resource
