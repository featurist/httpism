var middleware = require('./middleware')
var mergeQueryString = require('../mergeQueryString')

module.exports = middleware('querystring', function (request, next) {
  if (request.options.querystring instanceof Object) {
    console.warn('options.querystring is deprecated, please see https://github.com/featurist/httpism#params')
    mergeQueryString(request)
  }

  return next()
})
