# HTTPism

## Hypermedia

The idea is that you can point `httpism` at a resource, identified by a URL, then call `GET` or `POST` on it, then follow a link in the returned resource, and make another `GET` or `POST`, or any other kind of verb. Follow the hypermedia links, that's what its all about right?

## API (in [pogoscript](http://pogoscript.org/), of course)

    httpism = require 'httpism'

    home page = httpism.get! 'http://example.com/'

    articles = home page.resource '/articles'

    articles.get!

### GET

    the resource = resource.get! ()

Or

    linked resource = resource.get! 'relative/url.html'

### POST

    new resource = resource.post! { body = "whatever" }


### Content-Types

    r = resource.with response body parser 'application/json' (JSON.parse)
    result of json parse = r.get! 'people.json'.body

### Resource

    resource.body
    resource.status code
    resource.headers

### Middleware

    middleware (request) =
        intercept request (options, cb) =
            // inspect or modify request options, then...
            request (options, cb)

    resource = httpism.resource 'http://www.google.com' [
        middleware A
        middleware B
    ]
    response = resource.get!  // applies A then B
    response.get! '/another'  // applies A then B

### License

BSD