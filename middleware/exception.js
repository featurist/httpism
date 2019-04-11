var middleware = require('./middleware')
var extend = require('../extend')
var obfuscateUrlPassword = require('../obfuscateUrlPassword')
var logErrors = require('debug')('httpism:errors')

module.exports = middleware('exception', function (request, next) {
  return next().then(function (response) {
    var exceptions = request.options.exceptions
    var isException = exceptions === false ? false : typeof exceptions === 'function' ? exceptions(response) : response.statusCode >= 400

    if (isException) {
      var msg = request.method.toUpperCase() + ' ' + obfuscateUrlPassword(request.url) + ' => ' + response.statusCode + ' ' + response.statusText
      logErrors(msg, response)
      var error = extend(new Error(msg), response)
      throw error
    } else {
      return response
    }
  })
})
