var obfuscateUrlPassword = require('../obfuscateUrlPassword')
var isStream = require('../isStream')

module.exports = function prepareForLogging (r) {
  return removeUndefined({
    method: r.method,
    url: r.url && obfuscateUrlPassword(r.url),
    headers: r.headers,
    body: isStream(r.logBody) ? '[Stream]' : r.logBody,
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
