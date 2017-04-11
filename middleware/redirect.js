var middleware = require('./middleware')
var logResponse = require('./log').logResponse
var resolveUrl = require('../resolveUrl')

function consumeStream (s) {
  return new Promise(function (resolve, reject) {
    s.on('end', function () {
      resolve()
    })

    s.on('error', function (e) {
      reject(e)
    })

    s.resume()
  })
}

module.exports = middleware('redirect', function (request, next, client) {
  return next().then(function (response) {
    var statusCode = response.statusCode
    var location = response.headers.location

    if (request.options.redirect !== false && location && (statusCode === 300 || statusCode === 301 || statusCode === 302 || statusCode === 303 || statusCode === 307)) {
      return consumeStream(response.body).then(function () {
        logResponse(response)
        return client.get(resolveUrl(request.url, location), request.options).then(function (redirectResponse) {
          var error = new Error('redirect')
          error.redirectResponse = redirectResponse
          throw error
        })
      })
    } else {
      return response
    }
  })
})
