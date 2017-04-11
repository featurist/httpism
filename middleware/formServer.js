var middleware = require('./middleware')
var isStream = require('../isStream')
var setBodyToString = require('../setBodyToString')
var setHeaderTo = require('../setHeaderTo')
var shouldParseAs = require('../shouldParseAs')
var streamToString = require('../streamToString')
var querystringLite = require('../querystring-lite')

module.exports = middleware('form', function (request, next) {
  if (request.options.form && request.body instanceof Object && !isStream(request.body)) {
    var querystring = request.options.qs || querystringLite
    setBodyToString(request, querystring.stringify(request.body))
    setHeaderTo(request, 'content-type', 'application/x-www-form-urlencoded')
  }

  return next().then(function (response) {
    if (shouldParseAs(response, 'form', request)) {
      return streamToString(response.body).then(function (body) {
        var querystring = request.options.qs || querystringLite
        response.body = querystring.parse(body)
        return response
      })
    } else {
      return response
    }
  })
})
