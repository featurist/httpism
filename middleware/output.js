var middleware = require('./middleware')
var eos = require('end-of-stream')

module.exports = middleware('output', function (request, next) {
  if (request.options.output) {
    request.options.responseBody = 'stream'
    return next().then(function (response) {
      return new Promise(function (resolve, reject) {
        eos(response.body.pipe(request.options.output), function (error, result) {
          if (error) reject(error)
          else resolve(response)
        })
      })
    })
  } else {
    return next()
  }
})
