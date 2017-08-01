var middleware = require('./middleware')
var expandUrl = require('../expandUrl')

module.exports = middleware('params', function (request, next) {
  if (request.options.params instanceof Object) {
    var render = request.options.expandUrl || expandUrl
    request.url = render(request.url, request.options.params, request.options.qs)
  }

  return next()
})
