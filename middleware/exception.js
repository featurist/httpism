var middleware = require('./middleware')
var extend = require('../extend')
var obfuscateUrlPassword = require('../obfuscateUrlPassword')
var logError = require('debug')('httpism:error')
var prepareForLogging = require('./prepareForLogging')
var logDetailError = require('debug')('httpism:response:error')

module.exports = middleware('exception', function (request, next) {
  return next().then(function (response) {
    var exceptions = request.options.exceptions
    var isException = exceptions === false ? false : typeof exceptions === 'function' ? exceptions(response) : response.statusCode >= 400

    if (isException) {
      var obfuscatedUrl = obfuscateUrlPassword(request.url)
      var msg = request.method.toUpperCase() + ' ' + obfuscatedUrl + ' => ' + response.statusCode + ' ' + response.statusText
      logError(msg)
      var logResponse = prepareForLogging(response)
      logDetailError(logResponse)
      var error = extend(new Error(msg), response)
      error.url = obfuscatedUrl
      throw error
    } else {
      return response
    }
  })
})
