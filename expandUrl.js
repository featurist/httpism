var extend = require('./extend')
var parseUri = require('./parseUri')
var querystringLite = require('./querystring-lite')

module.exports = function expandUrl (pattern, _params, _qs) {
  var qs = _qs || querystringLite
  var params = _params || {}
  var onlyQueryParams = extend({}, params)

  var uri = parseUri(pattern)
  var pathPattern = uri.pathname
  var path = pathPattern.replace(/:([a-z_][a-z0-9_]*)\*/gi, function (_, id) {
    var param = params[id]
    delete onlyQueryParams[id]
    return encodeURI(paramToString(param))
  })

  path = path.replace(/:([a-z_][a-z0-9_]*)/gi, function (_, id) {
    var param = params[id]
    delete onlyQueryParams[id]
    return encodeURIComponent(paramToString(param))
  })

  var query = qs.stringify(extend(qs.parse(uri.search.replace(/^\?/, '')), onlyQueryParams))

  var fullpath = query ? path + '?' + query : path

  return uri.protocol + uri.authority + fullpath + uri.hash
}

function paramToString (p) {
  if (p === undefined || p === null) {
    return ''
  } else {
    return p
  }
}
