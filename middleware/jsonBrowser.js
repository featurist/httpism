/* global FormData */

var middleware = require('./middleware')

var setHeaderTo = require('../setHeaderTo')
var shouldParseAs = require('../shouldParseAs')

module.exports = middleware('json', function (request, next) {
  if (!(request.body instanceof FormData) && request.body instanceof Object) {
    request.body = JSON.stringify(request.body)
    setHeaderTo(request, 'content-type', 'application/json')
  }

  setHeaderTo(request, 'accept', 'application/json')

  return next().then(function (response) {
    if (shouldParseAs(response, 'json', request)) {
      response.body = JSON.parse(response.body, request.options.jsonReviver)
    }
    return response
  })
})
