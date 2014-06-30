http = require 'http'
urlUtils = require 'url'
_ = require 'underscore'

coerceArray (i) =
  if (i :: Array)
    i
  else
    [i]

merge (x) into (y) =
  if (x :: Object)
    r = {}

    for each @(ykey) in (Object.keys(y))
      r.(ykey) = y.(ykey)

    for each @(xkey) in (Object.keys(x))
      r.(xkey) = x.(xkey)
  
    r
  else
    y

parseClientArguments (middlewares, options) =
  if ((middlewares :: Array) @or (middlewares :: Function))
    {
      middlewares = coerceArray (middlewares)
      options = options @or {}
    }
  else if (middlewares :: Object)
    {
      middlewares = []
      options = middlewares
    }
  else
    {
      middlewares = []
      options = {}
    }

client (middlewares, clientOptions) =
  args = parseClientArguments (middlewares, clientOptions)
  middlewares := args.middlewares
  clientOptions := args.options

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

    sendRequest (method, url, body, options) =
      options := merge (options) into (clientOptions)
      response = send {
        method = method
        url = resolveUrl (url)
        body = body
        headers = {}
        options = options
      }!

      resource (response)

    res = {
      client (newMiddlewares, options) =
        args = parseClientArguments (newMiddlewares, options)
        client (coerceArray (args.middlewares).concat (middlewares), merge (args.options) into (clientOptions))

      resource (url) =
        resource {url = resolveUrl (url)}
    }

    sends (method) =
      res.(method) (url, options) = sendRequest (method.toUpperCase(), url, nil, options)!

    sends (method) withBody =
      res.(method) (url, body, options) = sendRequest (method.toUpperCase(), url, body, options)!

    sends 'get'
    sends 'post' withBody
    sends 'put' withBody

    _.extend (res, response)

  resource ({}, {})

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

exceptionResponse (request, next)! =
  response = next (request)!
  if (response.statusCode >= 400 @and request.options.exceptions != false)
    error = _.extend (@new Error ("#(request.method) #(request.url) => #(response.statusCode) #(http.STATUS_CODES.(response.statusCode))"), response)
    @throw error
  else
    response

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

logger (request, next) =
  if (request.options.log)
    console.log (request)

  response = next (request)!

  if (request.options.log)
    console.log (response)

  response

exports.json = client [exceptionResponse, jsonRequest, jsonResponse, stringRequest, stringResponse, logger, nodeSend]
