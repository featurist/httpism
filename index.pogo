http = require 'http'
urlUtils = require 'url'
_ = require 'underscore'

client (clientUrl, clientOptions, middlewares) =
  send =
    sendToMiddleware (middlewares, index) =
      middleware = middlewares.(index)
      if (middleware)
        @(request, api)
          middleware (request, @{ (sendToMiddleware (middlewares, index + 1)) (request, api) }, api)
      else
        nil

    sendToMiddleware (middlewares, 0)

  resource (response) =
    resolveUrl (url) =
      if (response.url)
        urlUtils.resolve (response.url, url)
      else if (clientUrl)
        urlUtils.resolve (clientUrl, url)
      else
        url

    sendRequest (method, url, body, options, api) =
      options := merge (options) into (clientOptions)
      response =
        try
          send (
            {
              method = method
              url = resolveUrl (url)
              body = body
              headers = {}
              options = options
            }
            api
          )!
        catch (e)
          if (e.redirectResponse)
            e.redirectResponse
          else
            @throw e

      resource (response)

    res = {
      api (url, options, newMiddlewares) =
        args = parseClientArguments (url, options, newMiddlewares)
        client (
          resolveUrl (args.url)
          merge (args.options) into (clientOptions)
          (args.middlewares) toArray.concat (middlewares)
        )
    }

    sends (method) =
      res.(method) (url, options) = sendRequest (method.toUpperCase(), url, nil, options, self)!

    sends (method) withBody =
      res.(method) (url, body, options) = sendRequest (method.toUpperCase(), url, body, options, self)!

    sends 'get'
    sends 'delete'
    sends 'head'
    sends 'post' withBody
    sends 'put' withBody
    sends 'patch' withBody
    sends 'options' withBody

    _.extend (res, response)

  resource {}

(i) toArray =
  if (i :: Array)
    i
  else if (i != nil)
    [i]
  else
    []

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

parseClientArguments (args, ...) =
  url = [
    arg <- args
    arg :: String
    arg
  ].0
  
  middlewares = ([
    arg <- args
    (arg :: Array) @or (arg :: Function)
    arg
  ].0) toArray

  options = ([
    arg <- args
    @not (arg :: Array) @and @not (arg :: Function) @and (arg :: Object)
    arg
  ].0) @or {}

  {
    middlewares = middlewares
    options = options
    url = url
  }

stream (s) toString =
  promise @(result, error)
    s.setEncoding 'utf-8'

    strings = []

    s.on 'data' @(d)
      strings.push(d)

    s.on 'end'
      result (strings.join '')

    s.on 'error' @(e)
      error (e)

consumeStream (s)! =
  promise @(result, error)
    s.on 'end'
      result()

    s.on 'error' @(e)
      error (e)

    s.resume()

jsonResponse (request, next) =
  response = next ()!
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

  next ()!

stringResponse (request, next)! =
  response = next ()!
  response.body = stream (response.body) toString!
  response

jsonRequest (request, next)! =
  if (request.body)
    request.body = JSON.stringify (request.body)
    request.headers.'content-type' = 'application/json'

  next ()!

exceptionResponse (request, next)! =
  response = next ()!
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
  log = request.options.log
  if (log == true @or log == 'request')
    console.log (request)

  response = next ()!

  if (log == true @or log == 'response')
    console.log (response)

  response

redirectResponse (request, next, api) =
  response = next ()!

  statusCode = response.statusCode
  location = response.headers.location
  if (request.options.redirect != false @and location @and (statusCode == 300 @or statusCode == 301 @or statusCode == 302 @or statusCode == 303 @or statusCode == 307))
    consumeStream (response.body)!
    redirectResponse = api.get (urlUtils.resolve(request.url, location), request.options)!
    @throw {
      redirectResponse = redirectResponse
    }
  else
    response

exports.json = client (nil, {}, [exceptionResponse, jsonRequest, jsonResponse, logger, stringRequest, stringResponse, redirectResponse, nodeSend])
