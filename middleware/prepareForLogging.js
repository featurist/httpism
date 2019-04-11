var obfuscateUrlPassword = require('../obfuscateUrlPassword')
var isStream = require('../isStream')

module.exports = function prepareForLogging (r) {
  return removeUndefined({
    method: r.method,
    url: r.url && obfuscateUrlPassword(r.url),
    headers: obfuscateHeaders(r.headers),
    body: isStream(r.logBody) ? '[Stream]' : r.logBody,
    statusCode: r.statusCode,
    statusText: r.statusText
  })
}

function obfuscateHeaders (headers) {
  var result = {}
  Object.keys(headers).forEach(function (key) {
    if (key === 'authorization') {
      result[key] = String(headers[key]).split(' ')[0] + ' ********'
    } else {
      result[key] = headers[key]
    }
  })
  return result
}

function removeUndefined (obj) {
  Object.keys(obj).forEach(function (key) {
    if (typeof obj[key] === 'undefined') {
      delete obj[key]
    }
  })

  return obj
}
