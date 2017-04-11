var middleware = require('./middleware')
var extend = require('../extend')
var obfuscateUrlPassword = require('../obfuscateUrlPassword')
var createDebug = require('debug')
var debugRequest = createDebug('httpism:request')
var debugResponse = createDebug('httpism:response')
var isStream = require('../isStream')

function logRequest (request) {
  if (debugRequest.enabled) {
    debugRequest(prepareForLogging(request))
  }
}

function logResponse (response) {
  if (!response.redirectResponse) {
    debugResponse(prepareForLogging(response))
  }
}

function prepareForLogging (r) {
  return removeUndefined({
    method: r.method,
    url: r.url && obfuscateUrlPassword(r.url),
    headers: r.headers,
    body: isStream(r.body) ? '[Stream]' : r.body,
    statusCode: r.statusCode,
    statusText: r.statusText
  })
}

function removeUndefined (obj) {
  Object.keys(obj).map(function (key) {
    if (typeof obj[key] === 'undefined') {
      delete obj[key]
    }
  })

  return obj
}

module.exports = middleware('log', function (request, next) {
  logRequest(request)

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

module.exports.logRequest = logRequest
module.exports.logResponse = logResponse
