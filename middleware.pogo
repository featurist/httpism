http = require 'http'
https = require 'https'
urlUtils = require 'url'
_ = require 'underscore'
mergeInto = require './mergeInto'
qs = require 'qs'

exports.stream (s) toString =
  promise @(result, error)
    s.setEncoding 'utf-8'

    strings = []

    s.on 'data' @(d)
      strings.push(d)

    s.on 'end'
      result (strings.join '')

    s.on 'error' @(e)
      error (e)

exports.consumeStream (s)! =
  promise @(result, error)
    s.on 'end'
      result()

    s.on 'error' @(e)
      error (e)

    s.resume()

exports.contentTypeIs = (response) contentTypeIs (expectedContentType) =
  re = @new RegExp "^\\s*#(expectedContentType)\\s*($|;)"
  re.test (response.headers.'content-type')

exports.contentTypeIsText = (response) contentTypeIsText =
  exports.(response) contentTypeIs 'text/.*'

is (body) aStream = body != nil @and (body.pipe :: Function)

shouldParse (response) as (type, contentType: nil, request: nil) =
  if (request.options.responseBody)
    type == request.options.responseBody
  else
    bodyType = responseBodyTypes.(type)

    if (bodyType)
      bodyType (response)

responseBodyTypes = {
  json (response) =
    (response) contentTypeIs 'application/json'

  text (response) =
    (response) contentTypeIsText @or (response) contentTypeIs 'application/javascript'

  form (response) =
    (response) contentTypeIs 'application/x-www-form-urlencoded'

  stream (response) = false
}

exports.json (request, next) =
  if ((request.body :: Object) @and @not is (request.body) aStream)
    set (request) bodyToString (JSON.stringify (request.body))
    set (request) header 'content-type' to 'application/json'

  set (request) header 'accept' to 'application/json'

  response = next ()!

  if (shouldParse (response) as 'json' (request: request))
    response.body = JSON.parse(exports.stream (response.body) toString!)
    response
  else
    response

set (r) bodyToString (s) =
  r.body = string (s) toStream
  r.headers.'content-length' = Buffer.byteLength(s, 'utf-8')

  if (r.options.log)
    r.stringBody = s

exports.stringToStream = string (s) toStream =
  {
    pipe (stream) =
      stream.write(s)
      stream.end()
  }

exports.exception (request, next)! =
  response = next ()!
  if (response.statusCode >= 400 @and request.options.exceptions != false)
    error = _.extend (@new Error ("#(request.method) #(request.url) => #(response.statusCode) #(http.STATUS_CODES.(response.statusCode))"), response)
    @throw error
  else
    response

nodeRequest (request, options, protocol, withResponse) =
  if (protocol == 'https:')
    https.request (merge (request) into (options.https), withResponse)
  else
    http.request (merge (request) into (options.http), withResponse)

exports.nodeSend (request) =
  promise @(result, error)
    url = urlUtils.parse(request.url)

    req = nodeRequest {
      hostname = url.hostname
      port = url.port
      method = request.method
      path = url.path
      headers = request.headers
    } (request.options, url.protocol) @(res)
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

exports.logRequest (request, next) =
  log = request.options.log
  if (log == true @or log == 'request')
    console.log (request)

  next ()!

exports.logResponse (request, next) =
  response = next ()!
  logResponse (response) dependingOnOptions (request.options)
  response

logResponse (response) dependingOnOptions (options) =
  log = options.log
  if (log == true @or log == 'response')
    console.log (response)

exports.redirect (request, next, api) =
  response = next ()!

  statusCode = response.statusCode
  location = response.headers.location
  if (request.options.redirect != false @and location @and (statusCode == 300 @or statusCode == 301 @or statusCode == 302 @or statusCode == 303 @or statusCode == 307))
    exports.consumeStream (response.body)!
    logResponse (response) dependingOnOptions (request.options)
    redirectResponse = api.get (urlUtils.resolve(request.url, location), request.options)!
    @throw {
      redirectResponse = redirectResponse
    }
  else
    response

exports.headers (request, next)! =
  if (request.options.headers)
    request.headers = merge (request.options.headers) into (request.headers)

  next ()!

exports.text (request, next)! =
  if (request.body :: String)
    set (request) bodyToString (request.body)
    set (request) header 'content-type' to 'text/plain'

  response = next()!

  if (shouldParse (response) as 'text' (request: request))
    response.body = exports.stream (response.body) toString!
    response
  else
    response

set (request) header (header) to (value) =
  if (@not request.headers.(header))
    request.headers.(header) = value

exports.form (request, next)! =
  if (request.options.form @and (request.body :: Object) @and @not is (request.body) aStream)
    set (request) bodyToString (qs.stringify(request.body))
    set (request) header 'content-type' to 'application/x-www-form-urlencoded'

  response = next()!

  if (shouldParse (response) as 'form' (request: request))
    response.body = qs.parse (exports.stream (response.body) toString!)

  response

exports.querystring (request, next) =
  if (request.options.querystring :: Object)
    split = request.url.split '?'
    path = split.0
    querystring = qs.parse (split.1)
    mergedQueryString = merge (request.options.querystring) into (querystring)

    request.url = "#(path)?#(qs.stringify(mergedQueryString))"

  next()!

exports.basicAuth (request, next) =
  if (request.options.basicAuth)
    encodeUsernameAndPassword() =
      @new Buffer "#(request.options.basicAuth.username.replace r/:/g ''):#(request.options.basicAuth.password)".toString 'base64'

    request.headers.authorization = "Basic #(encodeUsernameAndPassword())"

  next()!
