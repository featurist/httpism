var merge = require('./merge')
var resolveUrl = require('./resolveUrl')

function client (url, options, middleware) {
  var args = parseClientArguments(url, options, middleware)
  return new Httpism(args.url, args.options || {}, args.middleware)
}

function Httpism (url, options, middleware) {
  this.url = url
  this._options = options
  this.middleware = middleware
}

Httpism.prototype.send = function (method, url, body, _options) {
  console.warn('httpism.send() is deprecated please use httpism.request()')
  return this.request.apply(this, arguments)
}

Httpism.prototype.request = function (method, url, body, _options) {
  var request

  if (method instanceof Object) {
    request = method
  } else {
    var options = mergeClientOptions(_options, this._options)
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
    if (index < self.middleware.length) {
      var middleware = self.middleware[index]
      return middleware(req, function (nextRequest) { return sendToMiddleware(index + 1, nextRequest || req) }, self)
    }
  }

  return sendToMiddleware(0, request).then(function (response) {
    if (request.options.response === true) {
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
    if (key.toLowerCase() !== key) {
      headers[lower] = headers[key]
      delete headers[key]
    }
  })

  return headers
}

function findMiddlewareIndexes (names, middleware) {
  return names.map(function (name) {
    for (var n = 0; n < middleware.length; n++) {
      var m = middleware[n]
      if (m.httpismMiddleware && m.httpismMiddleware.name === name) {
        return n
      }
    }

    return -1
  }).filter(function (i) {
    return i >= 0
  })
}

function insertMiddlewareIntoIndex (middleware, m, index) {
  middleware.splice(index, 0, m)
}

Httpism.prototype.client = function (url, options, middleware) {
  var args = parseClientArguments(url, options, middleware)

  var client = new Httpism(
    resolveUrl(this.url, args.url),
    mergeClientOptions(args.options, this._options),
    this.middleware.slice()
  )

  if (args.middleware) {
    args.middleware.forEach(function (m) {
      client.use(m)
    })
  }

  return client
}

Httpism.prototype.api = function (url, options, middleware) {
  console.warn('httpism >= 3.0.0 renamed httpism.api() to httpism.client(), please update your usage')
  return this.client(url, options, middleware)
}

Httpism.prototype.insertMiddleware = function (m) {
  console.warn('httpism >= 3.0.0 renamed httpism.insertMiddleware() to httpism.use(), please update your usage')
  return this.use(m)
}

Httpism.prototype.use = function (m) {
  var meta = m.httpismMiddleware

  if (meta && (meta.before || meta.after)) {
    var position = meta.before || meta.after
    var names = typeof position === 'string' ? [position] : position
    var indexes = findMiddlewareIndexes(names, this.middleware)
    if (indexes.length) {
      var index = meta.before ? Math.min.apply(Math, indexes) : Math.max.apply(Math, indexes) + 1

      if (index >= 0) {
        insertMiddlewareIntoIndex(this.middleware, m, index)
        return
      }
    }

    throw new Error('no such middleware: ' + (meta.before || meta.after))
  } else {
    this.middleware.unshift(m)
  }
}

Httpism.prototype.removeMiddleware = function (name) {
  console.warn('httpism.removeMiddleware() is deprecated please use httpism.remove()')
  this.remove(name)
}

Httpism.prototype.remove = function (name) {
  var indexes = findMiddlewareIndexes([name], this.middleware)
  for (var i = indexes.length - 1; i >= 0; i--) {
    this.middleware.splice(indexes[i], 1)
  }
}

function addMethod (method) {
  Httpism.prototype[method] = function (url, options) {
    return this.request(method, url, undefined, options)
  }
}

function addMethodWithBody (method) {
  Httpism.prototype[method] = function (url, body, options) {
    return this.request(method, url, body, options)
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
  var url, options, middleware

  for (var n = 0; n < arguments.length; n++) {
    var arg = arguments[n]

    if (typeof arg === 'string') {
      url = arg
    } else if (typeof arg === 'function') {
      middleware = [arg]
    } else if (arg instanceof Array) {
      middleware = arg
    } else if (arg instanceof Object) {
      options = arg
    }
  }

  return {
    url: url,
    options: options,
    middleware: middleware
  }
}

function mergeClientOptions (x, y) {
  var z = merge(x, y)
  if (z && z.headers) { z.headers = merge(x && x.headers, y && y.headers) }
  return z
}

module.exports = client
