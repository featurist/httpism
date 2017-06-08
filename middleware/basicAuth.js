var middleware = require('./middleware')
var urlUtils = require('url')

function encodeBasicAuthorizationHeader (s) {
  return 'Basic ' + Buffer.from(s).toString('base64')
}

module.exports = middleware('basicAuth', function (request, next) {
  function basicAuthorizationHeader () {
    if (request.options.basicAuth) {
      var username = request.options.basicAuth.username || ''
      var password = request.options.basicAuth.password || ''

      return encodeBasicAuthorizationHeader(username.replace(/:/g, '') + ':' + password)
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
