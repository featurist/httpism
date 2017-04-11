var middleware = require('./middleware')
var extend = require('../extend')
var querystringLite = require('../querystring-lite')

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

module.exports = middleware('querystring', function (request, next) {
  if (request.options.params instanceof Object) {
    var render = request.options.expandUrl || expandUrl
    request.url = render(request.url, request.options.params, request.options.qs || querystringLite)
  }

  return next()
})
