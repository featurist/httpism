var merge = require('./merge')
var querystringLite = require('./querystring-lite')

module.exports = function (request) {
  var qs = request.options.qs || querystringLite

  var split = request.url.split('?')
  var path = split[0]
  var querystring = qs.parse(split[1] || '')
  var mergedQueryString = merge(request.options.querystring, querystring)

  request.url = path + '?' + qs.stringify(mergedQueryString)
}
