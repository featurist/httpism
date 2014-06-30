http = require 'http'
urlUtils = require 'url'
_ = require 'underscore'

client (middlewares, ...) =
  send =
    sendToMiddleware (middlewares, index) =
      middleware = middlewares.(index)
      if (middleware)
        @(request)
          middleware (request, sendToMiddleware (middlewares, index + 1))
      else
        nil

    sendToMiddleware (middlewares, 0)

  resource (response) =
    resolveUrl (url) =
      if (response.url)
        urlUtils.resolve (response.url, url)
      else
        url

    sendRequest (method, url, body) = 
      resource (send {method = method, url = resolveUrl (url), body = body, headers = {}}!)

    res = {
      client (newMiddlewares, ...) =
        client (newMiddlewares.concat (middlewares), ...)

      resource (url) =
        resource {url = url}
    }

    handle (method) =
      res.(method) (url, body) = sendRequest (method.toUpperCase(), url, body)!

    handle 'get'
    handle 'post'
    handle 'put'

    _.extend (res, response)

  resource {}

stream (s) toString =
  promise @(result, error)
    s.setEncoding 'utf-8'

    string = ''

    s.on 'data' @(d)
      string := string + d

    s.on 'end'
      result (string)

    s.on 'error' @(e)
      error (e)

jsonResponse (request, next) =
  response = next (request)!
  if (r/^\s*application\/json\s*($|;)/.test (response.headers.'content-type'))
    response.body = JSON.parse(response.body)
    response
  else
    response

stringRequest (request, next)! =
  if (request.body)
    body = request.body
    request.body = {
      pipe (stream) =
        stream.write(body)
        stream.end()
    }

  next (request)!

stringResponse (request, next)! =
  response = next (request)!
  response.body = stream (response.body) toString!
  response

jsonRequest (request, next)! =
  if (request.body)
    request.body = JSON.stringify (request.body)
    request.headers.'content-type' = 'application/json'

  next (request)!

nodeSend (request) =
  promise @(result, error)
    url = urlUtils.parse(request.url)
    req = http.request {
      hostname = url.hostname
      port = url.port
      method = request.method
      path = url.path
      headers = request.headers
    } @(res)
      result {
        statusCode = res.statusCode
        url = request.url
        headers = res.headers
        body = res
      }

    req.on 'error' @(e)
      error (e)

    if (request.body)
      request.body.pipe (req)
    else
      req.end()

exports.json = client (jsonRequest, jsonResponse, stringRequest, stringResponse, nodeSend)
