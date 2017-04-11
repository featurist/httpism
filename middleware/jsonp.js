var middleware = require('./middleware')
var randomString = require('random-string')
var mergeQueryString = require('../mergeQueryString')

function randomGlobal (value) {
  var name

  do {
    name = '_' + randomString({length: 20})
  } while (typeof window[name] !== 'undefined')

  window[name] = value

  return name
}

module.exports = middleware('jsonp', function (request, next) {
  var jsonp = request.options.jsonp

  if (jsonp) {
    request.options.querystring = request.options.querystring || {}

    return new Promise(function (resolve, reject) {
      var callbackName = randomGlobal(function (v) {
        delete window[callbackName]
        document.head.removeChild(script)
        resolve({
          statusCode: 200,
          headers: {},
          body: v
        })
      })

      request.options.querystring[jsonp] = callbackName

      mergeQueryString(request)

      var script = document.createElement('script')
      script.type = 'text/javascript'
      script.src = request.url
      script.onerror = function () {
        reject(new Error('could not load script tag for JSONP request: ' + request.url))
      }
      document.head.appendChild(script)
    })
  }

  return next()
})
