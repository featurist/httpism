var http = require('http')
var https = require('https')
var urlUtils = require('url')
var _ = require('underscore')
var merge = require('./merge')
var querystringLite = require('./querystring-lite')
var utils = require('./middlewareUtils')
var createDebug = require('debug')
var debug = createDebug('httpism')
var debugResponse = createDebug('httpism:response')
var debugRequest = createDebug('httpism:request')
var HttpsProxyAgent = require('https-proxy-agent')
var obfuscateUrlPassword = require('./obfuscateUrlPassword')
var mimeTypes = require('mime-types')
var proxyForUrl = require('proxy-from-env').getProxyForUrl

function middleware (name, fn) {
  exports[name] = fn
  fn.httpismMiddleware = {
    name: name
  }
}

middleware('exception', utils.exception)
middleware('querystring', utils.querystring)
middleware('expandUrl', utils.expandUrl)

exports.streamToString = function (s) {
  return new Promise(function (resolve, reject) {
    s.setEncoding('utf-8')
    var strings = []

    s.on('data', function (d) {
      strings.push(d)
    })

    s.on('end', function () {
      resolve(strings.join(''))
    })

    s.on('error', function (e) {
      reject(e)
    })
  })
}

exports.consumeStream = function (s) {
  return new Promise(function (resolve, reject) {
    s.on('end', function () {
      resolve()
    })

    s.on('error', function (e) {
      reject(e)
    })

    s.resume()
  })
}

function isStream (body) {
  return body !== undefined && typeof body.pipe === 'function'
}

middleware('json', function (request, next) {
  if (request.body instanceof Object && !isStream(request.body)) {
    setBodyToString(request, JSON.stringify(request.body))
    utils.setHeaderTo(request, 'content-type', 'application/json')
  }

  utils.setHeaderTo(request, 'accept', 'application/json')

  return next().then(function (response) {
    if (utils.shouldParseAs(response, 'json', request)) {
      return exports.streamToString(response.body).then(function (jsonString) {
        response.body = JSON.parse(jsonString, request.options.jsonReviver)
        return response
      })
    } else {
      return response
    }
  })
})

function setBodyToString (r, s) {
  r.body = stringToStream(s)
  r.headers['content-length'] = Buffer.byteLength(s, 'utf-8')
  r.stringBody = s
}

function stringToStream (s) {
  return {
    pipe: function (stream) {
      stream.write(s)
      stream.end()
    }
  }
}

exports.stringToStream = stringToStream

function nodeRequest (request, options, protocol, withResponse) {
  if (protocol === 'https:') {
    return https.request(merge(request, options.https), withResponse)
  } else {
    return http.request(merge(request, options.http), withResponse)
  }
}

function proxyUrl (request, proxy) {
  var url = urlUtils.parse(request.url)
  var proxyUrl = urlUtils.parse(proxy)

  request.headers.host = url.hostname

  if (url.protocol === 'https:') {
    url.agent = new HttpsProxyAgent(proxy)
    return url
  } else {
    if (proxyUrl.auth) {
      request.headers['proxy-authorization'] = encodeBasicAuthorizationHeader(proxyUrl.auth)
    }

    return {
      hostname: proxyUrl.hostname,
      port: proxyUrl.port,
      path: request.url
    }
  }
}

function parseUrl (request) {
  var proxy = proxyForUrl(request.url) || request.options.proxy

  if (proxy) {
    return proxyUrl(request, proxy)
  } else {
    return urlUtils.parse(request.url)
  }
}

middleware('http', function (request) {
  return new Promise(function (resolve, reject) {
    var url = parseUrl(request)

    var req = nodeRequest(
      {
        hostname: url.hostname,
        port: url.port,
        method: request.method,
        path: url.path,
        headers: request.headers,
        agent: url.agent
      },
      request.options,
      url.protocol,
      function (res) {
        return resolve({
          statusCode: res.statusCode,
          statusText: http.STATUS_CODES[res.statusCode],
          url: request.url,
          headers: res.headers,
          body: res
        })
      }
    )

    req.on('error', function (e) {
      reject(e)
    })

    if (request.body) {
      request.body.pipe(req)
    } else {
      req.end()
    }
  })
})

function removeUndefined (obj) {
  Object.keys(obj).map(function (key) {
    if (typeof obj[key] === 'undefined') {
      delete obj[key]
    }
  })

  return obj
}

function prepareForLogging (r) {
  return removeUndefined({
    method: r.method,
    url: r.url && obfuscateUrlPassword(r.url),
    headers: r.headers,
    body: isStream(r.body) ? '[Stream]' : r.body,
    statusCode: r.statusCode,
    statusText: r.statusText
  })
}

function logRequest (request) {
  if (debugRequest.enabled) {
    debugRequest(prepareForLogging(request))
  }
}

middleware('log', function (request, next) {
  logRequest(request)

  var promise = next()

  if (debugResponse.enabled) {
    return promise.then(function (response) {
      logResponse(response)
      return response
    }, function (e) {
      var res = _.extend({}, e)
      logResponse(res)
      throw e
    })
  } else {
    return promise
  }
})

middleware('debugLog', function (request, next) {
  if (debug.enabled) {
    var startTime = Date.now()
    return next().then(function (response) {
      var headerTime = Date.now() - startTime
      response.body.on('end', function () {
        var bodyTime = Date.now() - startTime
        debug(request.method.toUpperCase() + ' ' + obfuscateUrlPassword(request.url) + ' => ' + response.statusCode + ' (' + headerTime + 'ms, ' + bodyTime + 'ms)')
      })
      return response
    }, function (error) {
      var headerTime = Date.now() - startTime
      debug(request.method.toUpperCase() + ' ' + obfuscateUrlPassword(request.url) + ' => ' + error.message + ' (' + headerTime + 'ms)')
      throw error
    })
  } else {
    return next()
  }
})

function logResponse (response) {
  if (!response.redirectResponse) {
    debugResponse(prepareForLogging(response))
  }
}

middleware('redirect', function (request, next, client) {
  return next().then(function (response) {
    var statusCode = response.statusCode
    var location = response.headers.location

    if (request.options.redirect !== false && location && (statusCode === 300 || statusCode === 301 || statusCode === 302 || statusCode === 303 || statusCode === 307)) {
      return exports.consumeStream(response.body).then(function () {
        logResponse(response)
        return client.get(urlUtils.resolve(request.url, location), request.options).then(function (redirectResponse) {
          var error = new Error('redirect')
          error.redirectResponse = redirectResponse
          throw error
        })
      })
    } else {
      return response
    }
  })
})

function loadCookies (cookies, url) {
  return cookies.getCookieStringSync(url)
}

function storeCookies (cookies, url, header) {
  if (header) {
    var headers =
      header instanceof Array
        ? header
        : [header]

    headers.forEach(function (setCookieHeader) {
      cookies.setCookieSync(setCookieHeader, url)
    })
  }
}

middleware('cookies', function (request, next, client) {
  var cookies

  if (client._options.cookies === true) {
    var toughCookie = require('tough-cookie')
    cookies = request.options.cookies = client._options.cookies = new toughCookie.CookieJar()
  } else {
    cookies = request.options.cookies
  }

  if (cookies) {
    request.headers.cookie = loadCookies(cookies, request.url)
    return next().then(function (response) {
      storeCookies(cookies, response.url, response.headers['set-cookie'])
      return response
    })
  } else {
    return next()
  }
})

middleware('text', function (request, next) {
  if (typeof request.body === 'string') {
    setBodyToString(request, request.body)
    utils.setHeaderTo(request, 'content-type', 'text/plain')
  }

  return next().then(function (response) {
    if (utils.shouldParseAs(response, 'text', request)) {
      return exports.streamToString(response.body).then(function (body) {
        response.body = body
        return response
      })
    } else {
      return response
    }
  })
})

middleware('form', function (request, next) {
  if (request.options.form && request.body instanceof Object && !isStream(request.body)) {
    var querystring = request.options.qs || querystringLite
    setBodyToString(request, querystring.stringify(request.body))
    utils.setHeaderTo(request, 'content-type', 'application/x-www-form-urlencoded')
  }

  return next().then(function (response) {
    if (utils.shouldParseAs(response, 'form', request)) {
      return exports.streamToString(response.body).then(function (body) {
        var querystring = request.options.qs || querystringLite
        response.body = querystring.parse(body)
        return response
      })
    } else {
      return response
    }
  })
})

function contentTypeOfStream (stream) {
  if (typeof stream.getHeaders === 'function') {
    return stream.getHeaders()['content-type']
  } else if (stream.path) {
    return mimeTypes.lookup(stream.path)
  }
}

middleware('streamContentType', function (request, next) {
  if (isStream(request.body) && !request.headers['content-type']) {
    request.headers['content-type'] = contentTypeOfStream(request.body)
  }
  return next()
})

function encodeBasicAuthorizationHeader (s) {
  return 'Basic ' + Buffer.from(s).toString('base64')
}

middleware('basicAuth', function (request, next) {
  function basicAuthorizationHeader () {
    if (request.options.basicAuth) {
      return encodeBasicAuthorizationHeader(request.options.basicAuth.username.replace(/:/g, '') + ':' + request.options.basicAuth.password)
    } else {
      var url = urlUtils.parse(request.url)
      if (url.auth) {
        return encodeBasicAuthorizationHeader(url.auth)
      }
    }
  }

  var header = basicAuthorizationHeader()
  if (header) {
    request.headers.authorization = header
  }

  return next()
})
