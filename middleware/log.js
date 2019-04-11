var middleware = require('./middleware')
var extend = require('../extend')
var createDebug = require('debug')
var debugResponse = createDebug('httpism:response')
var prepareForLogging = require('./prepareForLogging')

function logResponse (response) {
  if (!response.redirectResponse) {
    debugResponse(prepareForLogging(response))
  }
}

module.exports = middleware('log', function (request, next) {
  var promise = next()

  if (debugResponse.enabled) {
    return promise.then(function (response) {
      logResponse(response)
      return response
    }, function (e) {
      var res = extend({}, e)
      logResponse(res)
      throw e
    })
  } else {
    return promise
  }
})

module.exports.logResponse = logResponse
