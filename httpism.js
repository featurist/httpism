var merge = require('./merge')
var resolveUrl = require('./resolveUrl')
var utils = require('./middlewareUtils')

function client (url, options, middlewares) {
  return new Httpism(url, options, middlewares)
}

function Httpism (url, options, middlewares) {
  this.url = url
  this._options = options
  this.middlewares = middlewares
}

Httpism.prototype.send = function (method, url, body, _options) {
  var request

  if (method instanceof Object) {
    request = method
  } else {
    var options = merge(_options, this._options)
    request = {
      method: method,
      url: resolveUrl(this.url, url),
      headers: lowerCaseHeaders(options.headers || {}),
      body: body,
      options: options
    }
  }

  var self = this

  function sendToMiddleware (index, req) {
    if (index < self.middlewares.length) {
      var middleware = self.middlewares[index]
      return middleware(req, function (nextRequest) { return sendToMiddleware(index + 1, nextRequest || req) }, self)
    }
  }

  return sendToMiddleware(0, request).then(function (response) {
    if (options.response == true) {
      return response
    } else {
      responseCompatibility(response)
      return response.body
    }
  }, function (e) {
    if (e.redirectResponse) {
      return e.redirectResponse
    } else {
      throw e
    }
  })
}

function responseCompatibility (response) {
  function responseWarning () {
    console.warn('httpism >= 3.0.0 returns the response body by default, please pass the {response: true} option if you want the whole response')
  }

  if (response.body instanceof Object) {
    if (response.body && !response.body.hasOwnProperty('body')) {
      Object.defineProperty(response.body, 'body', {
        get: function () {
          responseWarning()
          return this
        }
      })
    }

    if (response.body && !response.body.hasOwnProperty('url')) {
      Object.defineProperty(response.body, 'url', {
        get: function () {
          responseWarning()
          return response.url
        }
      })
    }

    if (response.body && !response.body.hasOwnProperty('statusCode')) {
      Object.defineProperty(response.body, 'statusCode', {
        get: function () {
          responseWarning()
          return response.statusCode
        }
      })
    }

    if (response.body && !response.body.hasOwnProperty('headers')) {
      Object.defineProperty(response.body, 'headers', {
        get: function () {
          responseWarning()
          return response.headers
        }
      })
    }
  }
}

function lowerCaseHeaders (headers) {
  Object.keys(headers).forEach(function (key) {
    var lower = key.toLowerCase()
    if (key.toLowerCase() != key) {
      headers[lower] = headers[key]
      delete headers[key]
    }
  })

  return headers
}

function findMiddlewareIndexes (names, middlewares) {
  return names.map(function (name) {
    for (var n = 0; n < middlewares.length; n++) {
      if (middlewares[n].middleware == name) {
        return n
      }
    }

    return -1
  }).filter(function (i) {
    return i >= 0
  })
}

function insertMiddlewareIntoIndex (middlewares, m, index) {
  middlewares.splice(index, 0, m)
}

Httpism.prototype.client = function (url, options, middlewares) {
  var args = parseClientArguments(url, options, middlewares)

  var client = new Httpism(
    resolveUrl(this.url, args.url),
    merge(args.options, this._options),
    this.middlewares.slice()
  )

  if (args.middlewares) {
    args.middlewares.forEach(function (m) {
      client.insertMiddleware(m)
    })
  }

  return client
}

Httpism.prototype.api = function (url, options, middlewares) {
  console.warn('httpism >= 3.0.0 renamed httpism.api() to httpism.client(), please update your usage')
  return this.client(url, options, middlewares)
}

Httpism.prototype.insertMiddleware = function (m) {
  if (m.before || m.after) {
    var position = m.before || m.after
    var names = typeof position === 'string' ? [position] : position
    var indexes = findMiddlewareIndexes(names, this.middlewares)
    if (indexes.length) {
      var index = m.before ? Math.min.apply(Math, indexes) : Math.max.apply(Math, indexes) + 1

      if (index >= 0) {
        insertMiddlewareIntoIndex(this.middlewares, m, index)
        return
      }
    }

    throw new Error('no such middleware: ' + (m.before || m.after))
  } else {
    this.middlewares.unshift(m)
  }
}

Httpism.prototype.removeMiddleware = function (name) {
  var indexes = findMiddlewareIndexes([name], this.middlewares)
  for (var i = indexes.length - 1; i >= 0; i--) {
    this.middlewares.splice(indexes[i], 1)
  }
}

function addMethod (method) {
  Httpism.prototype[method] = function (url, options) {
    return this.send(method, url, undefined, options)
  }
}

function addMethodWithBody (method) {
  Httpism.prototype[method] = function (url, body, options) {
    return this.send(method, url, body, options)
  }
}

addMethod('get')
addMethod('delete')
addMethod('head')
addMethodWithBody('post')
addMethodWithBody('put')
addMethodWithBody('patch')
addMethodWithBody('options')

function parseClientArguments () {
  var url, options, middlewares

  for (var n = 0; n < arguments.length; n++) {
    var arg = arguments[n]

    if (typeof arg === 'string') {
      url = arg
    } else if (typeof arg === 'function') {
      middlewares = [arg]
    } else if (arg instanceof Array) {
      middlewares = arg
    } else if (arg instanceof Object) {
      options = arg
    }
  }

  return {
    url: url,
    options: options,
    middlewares: middlewares
  }
}

module.exports = client
