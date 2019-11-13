var extend = require('../extend')
var obfuscateUrlPassword = require('../obfuscateUrlPassword')
var prepareForLogging = require('./prepareForLogging')

module.exports = function (logError, logDetailError) {
  return function (request, next) {
    return next().then(function (response) {
      var exceptions = request.options.exceptions
      var isException = exceptions === false ? false : typeof exceptions === 'function' ? exceptions(response) : response.statusCode >= 400

      if (isException) {
        var obfuscatedUrl = obfuscateUrlPassword(request.url)
        var msg = request.method.toUpperCase() + ' ' + obfuscatedUrl + ' => ' + response.statusCode + ' ' + response.statusText
        if (logError) {
          logError(msg)
        }
        var logResponse = prepareForLogging(response)
        if (logDetailError) {
          logDetailError(logResponse)
        }
        var error = extend(new Error(msg), response)
        error.url = obfuscatedUrl
        throw error
      } else {
        return response
      }
    })
  }
}
