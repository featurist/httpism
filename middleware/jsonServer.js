var middleware = require('./middleware')
var isStream = require('../isStream')
var setBodyToString = require('../setBodyToString')
var setHeaderTo = require('../setHeaderTo')
var shouldParseAs = require('../shouldParseAs')
var streamToString = require('../streamToString')

module.exports = middleware('json', function (request, next) {
  if (request.body instanceof Object && !isStream(request.body)) {
    setBodyToString(request, JSON.stringify(request.body))
    setHeaderTo(request, 'content-type', 'application/json')
  }

  setHeaderTo(request, 'accept', 'application/json')

  return next().then(function (response) {
    if (shouldParseAs(response, 'json', request)) {
      return streamToString(response.body).then(function (jsonString) {
        response.body = JSON.parse(jsonString, request.options.jsonReviver)
        return response
      })
    } else {
      return response
    }
  })
})
