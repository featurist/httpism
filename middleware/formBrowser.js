var middleware = require('./middleware')

var setHeaderTo = require('../setHeaderTo')
var shouldParseAs = require('../shouldParseAs')
var querystringLite = require('../querystring-lite')

module.exports = middleware('form', function (request, next) {
  if (request.options.form && request.body instanceof Object) {
    var querystring = request.options.qs || querystringLite
    request.body = querystring.stringify(request.body)
    setHeaderTo(request, 'content-type', 'application/x-www-form-urlencoded')
  }

  return next().then(function (response) {
    var querystring = request.options.qs || querystringLite
    if (shouldParseAs(response, 'form', request)) {
      response.body = querystring.parse(response.body)
    }
    return response
  })
})
