var merge = require('./merge')
var querystringLite = require('./querystring-lite')
var obfuscateUrlPassword = require('./obfuscateUrlPassword')

module.exports.setHeaderTo = function (request, header, value) {
  if (!request.headers[header]) {
    return (request.headers[header] = value)
  }
}

var responseBodyTypes = {
  json: function (response) {
    return contentTypeIs(response, 'application/json')
  },
  text: function (response) {
    return contentTypeIsText(response) || contentTypeIs(response, 'application/javascript')
  },
  form: function (response) {
    return contentTypeIs(response, 'application/x-www-form-urlencoded')
  },
  stream: function () {
    return false
  }
}

function contentTypeIs (response, expectedContentType) {
  var re = new RegExp('^\\s*' + expectedContentType + '\\s*($|;)')
  return re.test(response.headers['content-type'])
}

function contentTypeIsText (response) {
  return contentTypeIs(response, 'text/.*')
}

module.exports.shouldParseAs = function (response, type, request) {
  if (request.options.responseBody) {
    return type === request.options.responseBody
  } else {
    var bodyType = responseBodyTypes[type]
    if (bodyType) {
      return bodyType(response)
    }
  }
}

function extend (object, extension) {
  var keys = Object.keys(extension)

  for (var n = 0; n < keys.length; n++) {
    var key = keys[n]
    object[key] = extension[key]
  }

  return object
}

exports.extend = extend

exports.exception = function (request, next) {
  return next().then(function (response) {
    var exceptions = request.options.exceptions
    var isException = exceptions === false ? false : typeof exceptions === 'function' ? exceptions(response) : response.statusCode >= 400

    if (isException) {
      var msg = request.method.toUpperCase() + ' ' + obfuscateUrlPassword(request.url) + ' => ' + response.statusCode + ' ' + response.statusText
      var error = extend(new Error(msg), response)
      throw error
    } else {
      return response
    }
  })
}

exports.querystring = function (request, next) {
  if (request.options.querystring instanceof Object) {
    console.warn('options.querystring is deprecated, please see https://github.com/featurist/httpism#params')
    exports.mergeQueryString(request)
  }

  return next()
}

exports.expandUrl = function (request, next) {
  if (request.options.params instanceof Object) {
    var render = request.options.expandUrl || expandUrl
    request.url = render(request.url, request.options.params, request.options.qs || querystringLite)
  }

  return next()
}

exports.mergeQueryString = function (request) {
  var qs = request.options.qs || querystringLite

  var split = request.url.split('?')
  var path = split[0]
  var querystring = qs.parse(split[1] || '')
  var mergedQueryString = merge(request.options.querystring, querystring)
  request.url = path + '?' + qs.stringify(mergedQueryString)
}

function expandUrl (pattern, _params, qs) {
  var params = _params || {}
  var onlyQueryParams = extend({}, params)

  var url = pattern.replace(/:([a-z_][a-z0-9_]*)\*/gi, function (_, id) {
    var param = params[id]
    delete onlyQueryParams[id]
    return encodeURI(paramToString(param))
  })

  url = url.replace(/:([a-z_][a-z0-9_]*)/gi, function (_, id) {
    var param = params[id]
    delete onlyQueryParams[id]
    return encodeURIComponent(paramToString(param))
  })

  var query = qs.stringify(onlyQueryParams)

  if (query) {
    return url + '?' + query
  } else {
    return url
  }
}

function paramToString (p) {
  if (p === undefined || p === null) {
    return ''
  } else {
    return p
  }
}
