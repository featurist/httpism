var middleware = require('./middleware')
var debug = require('debug')('httpism')
var obfuscateUrlPassword = require('../obfuscateUrlPassword')
var createDebug = require('debug')
var debugRequest = createDebug('httpism:request')
var prepareForLogging = require('./prepareForLogging')

module.exports = middleware('debugLog', function (request, next) {
  if (debugRequest.enabled) {
    debugRequest(prepareForLogging(request))
  }
  if (debug.enabled) {
    var startTime = Date.now()
    return next().then(function (response) {
      var headerTime = Date.now() - startTime
      response.body.on('end', function () {
        var bodyTime = Date.now() - startTime
        debug(request.method.toUpperCase() + ' ' + obfuscateUrlPassword(request.url) + ' => ' + response.statusCode + ' (' + headerTime + 'ms, ' + bodyTime + 'ms)')
      })
      return response
    }, function (error) {
      var headerTime = Date.now() - startTime
      debug(request.method.toUpperCase() + ' ' + obfuscateUrlPassword(request.url) + ' => ' + error.message + ' (' + headerTime + 'ms)')
      throw error
    })
  } else {
    return next()
  }
})
