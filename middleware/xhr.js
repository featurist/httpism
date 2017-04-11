var middleware = require('./middleware')

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

function isCrossDomain (url) {
  return /^https?:\/\//.test(url)
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

function addAbortToPromise (promise, abort) {
  var then = promise.then
  promise.then = function () {
    var p = then.apply(this, arguments)
    p.abort = abort
    addAbortToPromise(p, abort)
    return p
  }
}

module.exports = middleware('xhr', function (request) {
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
