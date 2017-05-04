var middleware = require('./middleware')
var isStream = require('../isStream')
var mimeTypes = require('mime-types')

function contentTypeOfStream (stream) {
  if (typeof stream.getHeaders === 'function') {
    return stream.getHeaders()['content-type']
  } else if (stream.path) {
    return mimeTypes.lookup(stream.path)
  }
}

module.exports = middleware('streamContentType', function (request, next) {
  if (isStream(request.body) && !request.headers['content-type']) {
    var contentType = contentTypeOfStream(request.body)
    if (contentType) {
      request.headers['content-type'] = contentType
    }
  }
  return next()
})
