urlUtils = require 'url'
_ = require 'underscore'
middleware = require './middleware'
mergeInto = require './mergeInto'

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

module.exports = client (
  nil
  {}
  [
    middleware.logResponse
    middleware.headers
    middleware.exception
    middleware.text
    middleware.form
    middleware.json
    middleware.querystring
    middleware.basicAuth
    middleware.redirect
    middleware.logRequest
    middleware.nodeSend
  ]
)

module.exports.raw = client (nil, {}, [middleware.nodeSend])
