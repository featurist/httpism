var obfuscateUrlPassword = require('../obfuscateUrlPassword')

module.exports = function prepareForLogging (r) {
  return removeUndefined({
    method: r.method,
    url: r.url && obfuscateUrlPassword(r.url),
    headers: r.headers && obfuscateHeaders(r.headers),
    body: r.stringBody !== undefined ? r.stringBody : r.body ? '[Stream]' : undefined,
    statusCode: r.statusCode,
    statusText: r.statusText
  })
}

function obfuscateHeaders (headers) {
  var result = {}
  Object.keys(headers).forEach(function (key) {
    if (key.toLowerCase() === 'authorization') {
      var auth = headers[key].split(/\s*/g)

      if (auth.length > 1) {
        result[key] = String(headers[key]).split(' ')[0] + ' ********'
      } else {
        result[key] = '********'
      }
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
