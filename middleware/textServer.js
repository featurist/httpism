var middleware = require('./middleware')
var setBodyToString = require('../setBodyToString')
var setHeaderTo = require('../setHeaderTo')
var shouldParseAs = require('../shouldParseAs')
var streamToString = require('../streamToString')

module.exports = middleware('text', function (request, next) {
  if (typeof request.body === 'string') {
    setBodyToString(request, request.body)
    setHeaderTo(request, 'content-type', 'text/plain')
  }

  return next().then(function (response) {
    if (shouldParseAs(response, 'text', request)) {
      return streamToString(response.body).then(function (body) {
        response.body = body
        return response
      })
    } else {
      return response
    }
  })
})
