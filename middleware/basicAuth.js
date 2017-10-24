var middleware = require('./middleware')
var parseUri = require('../parseUri')
var base64 = require('base-64')

function encodeBasicAuthorizationHeader (s) {
  return 'Basic ' + base64.encode(s)
}

module.exports = middleware('basicAuth', function (request, next) {
  function basicAuthorizationHeader () {
    if (request.options.basicAuth) {
      var username = request.options.basicAuth.username || ''
      var password = request.options.basicAuth.password || ''

      return encodeBasicAuthorizationHeader(username.replace(/:/g, '') + ':' + password)
    } else {
      var url = parseUri(request.url)
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
