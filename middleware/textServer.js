var middleware = require('./middleware')
var setBodyToString = require('../setBodyToString')
var setHeaderTo = require('../setHeaderTo')
var shouldParseAs = require('../shouldParseAs')
var readBodyAsString = require('../readBodyAsString')

module.exports = middleware('text', function (request, next) {
  if (typeof request.body === 'string') {
    setBodyToString(request, request.body)
    setHeaderTo(request, 'content-type', 'text/plain')
  }

  return next().then(function (response) {
    if (shouldParseAs(response, 'text', request)) {
      return readBodyAsString(response).then(function () {
        response.body = response.stringBody
        return response
      })
    } else {
      return response
    }
  })
})
