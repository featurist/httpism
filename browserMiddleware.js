var window = require('global')
var utils = require('./middlewareUtils')
var querystringLite = require('./querystring-lite')
var randomString = require('random-string')

function middleware (name, fn) {
  exports[name] = fn
  fn.httpismMiddleware = {
    name: name
  }
}

middleware('exception', utils.exception)
middleware('querystring', utils.querystring)
middleware('expandUrl', utils.expandUrl)

middleware('json', function (request, next) {
  if (request.body instanceof Object) {
    request.body = JSON.stringify(request.body)
    utils.setHeaderTo(request, 'content-type', 'application/json')
  }

  utils.setHeaderTo(request, 'accept', 'application/json')

  return next().then(function (response) {
    if (utils.shouldParseAs(response, 'json', request)) {
      response.body = JSON.parse(response.body, request.options.jsonReviver)
    }
    return response
  })
})

function randomGlobal (value) {
  var name

  do {
    name = '_' + randomString({length: 20})
  } while (typeof window[name] !== 'undefined')

  window[name] = value

  return name
}

middleware('jsonp', function (request, next) {
  var jsonp = request.options.jsonp

  if (jsonp) {
    request.options.querystring = request.options.querystring || {}

    return new Promise(function (resolve, reject) {
      var callbackName = randomGlobal(function (v) {
        delete window[callbackName]
        document.head.removeChild(script)
        resolve({
          statusCode: 200,
          headers: {},
          body: v
        })
      })

      request.options.querystring[jsonp] = callbackName

      utils.mergeQueryString(request)

      var script = document.createElement('script')
      script.type = 'text/javascript'
      script.src = request.url
      script.onerror = function () {
        reject(new Error('could not load script tag for JSONP request: ' + request.url))
      }
      document.head.appendChild(script)
    })
  }

  return next()
})

middleware('text', function (request, next) {
  if (typeof request.body === 'string') {
    utils.setHeaderTo(request, 'content-type', 'text/plain;charset=UTF-8')
  }

  return next()
})

middleware('form', function (request, next) {
  if (request.options.form && request.body instanceof Object) {
    var querystring = request.options.qs || querystringLite
    setBodyToString(request, querystring.stringify(request.body))
    utils.setHeaderTo(request, 'content-type', 'application/x-www-form-urlencoded')
  }

  return next().then(function (response) {
    var querystring = request.options.qs || querystringLite
    if (utils.shouldParseAs(response, 'form', request)) {
      response.body = querystring.parse(response.body)
    }
    return response
  })
})

function setBodyToString (r, s) {
  r.body = s
}

function parseHeaders (headers) {
  var object = {}
  var lines = headers.split('\n')

  for (var n = 0; n < lines.length; n++) {
    var line = lines[n]
    var match = /^(.*?):(.*)/.exec(line)

    if (match) {
      object[match[1].toLowerCase()] = match[2].trim()
    }
  }

  return object
}

function toUpperCase (x) {
  return x.toUpperCase()
}

function formatHeaderName (name) {
  return name.replace(/^([a-z])/, toUpperCase).replace(/-([a-z])/g, toUpperCase)
}

function setHeaders (headers, xhr) {
  var headerNames = Object.keys(headers)

  for (var n = 0; n < headerNames.length; n++) {
    var key = headerNames[n]
    var headerName = formatHeaderName(key)
    xhr.setRequestHeader(headerName, headers[key])
  }
}

function responseUrl (xhr, requestUrl) {
  var origin = window.location.origin
  var responseUrl = xhr.responseURL

  if (responseUrl) {
    if (responseUrl.substring(0, origin.length) === origin) {
      return responseUrl.substring(origin.length)
    } else {
      return responseUrl
    }
  } else {
    return requestUrl
  }
}

middleware('send', function (request) {
  var Xhr = request.options.xhr || window.XMLHttpRequest
  var xhr = new Xhr()
  var rejectPromise

  var promise = new Promise(function (resolve, reject) {
    rejectPromise = reject
    xhr.open(request.method, request.url, true)
    xhr.onload = function () {
      var statusCode = xhr.status

      var response = {
        body: statusCode === 204 ? undefined : xhr.responseText,
        headers: parseHeaders(xhr.getAllResponseHeaders()),
        statusCode: statusCode,
        url: responseUrl(xhr, request.url),
        xhr: xhr,
        statusText: xhr.statusText
      }

      resolve(response)
    }

    xhr.onerror = function () {
      rejectPromise(new Error('failed to connect to ' + request.method + ' ' + request.url))
    }

    if (!isCrossDomain(request.url) && !request.headers['x-requested-with']) {
      request.headers['x-requested-with'] = 'XMLHttpRequest'
    }

    setHeaders(request.headers, xhr)
    xhr.withCredentials = !!request.options.withCredentials

    xhr.send(request.body)
  })

  function abort () {
    xhr.abort()
    var error = new Error('aborted connection to ' + request.method + ' ' + request.url)
    error.aborted = true
    rejectPromise(error)
  }
  addAbortToPromise(promise, abort)

  return promise
})

function isCrossDomain (url) {
  return /^https?:\/\//.test(url)
}

function addAbortToPromise (promise, abort) {
  var then = promise.then
  promise.then = function () {
    var p = then.apply(this, arguments)
    p.abort = abort
    addAbortToPromise(p, abort)
    return p
  }
}
