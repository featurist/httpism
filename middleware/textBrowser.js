var middleware = require('./middleware')
var setHeaderTo = require('../setHeaderTo')

module.exports = middleware('text', function (request, next) {
  if (typeof request.body === 'string') {
    setHeaderTo(request, 'content-type', 'text/plain;charset=UTF-8')
  }

  return next()
})
