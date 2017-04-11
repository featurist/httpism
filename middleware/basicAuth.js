var middleware = require('./middleware')
var urlUtils = require('url')

function encodeBasicAuthorizationHeader (s) {
  return 'Basic ' + Buffer.from(s).toString('base64')
}

module.exports = middleware('basicAuth', function (request, next) {
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
