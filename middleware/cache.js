var debug = require('debug')('httpism:cache')
var fileStore = require('./fileStore')
var urlUtils = require('url')
var pathUtils = require('path')

function urlProtocol (url) {
  if (pathUtils.isAbsolute(url)) {
    return 'file'
  } else {
    var parsedUrl = urlUtils.parse(url)
    return parsedUrl.protocol || 'file'
  }
}

function createStore (options) {
  var url = typeof options === 'object' && options.hasOwnProperty('url') ? options.url : undefined
  var protocol = urlProtocol(url)

  var storeConstructor = storeTypes[protocol]

  if (!storeConstructor) {
    throw new Error('no such store for url: ' + url)
  }

  return storeConstructor(options)
}

module.exports = function (options) {
  var store = createStore(options)
  var isResponseCachable = typeof options === 'object' &&
    options.hasOwnProperty('isResponseCachable')
    ? options.isResponseCachable
    : function (response) {
      return response.statusCode >= 200 && response.statusCode < 400
    }

  var httpismCache = function (req, next) {
    var url = req.url

    return store.responseExists(url).then(function (exists) {
      if (exists) {
        debug('hit', url)
        return store.readResponse(url)
      } else {
        debug('miss', url)
        return next().then(function (response) {
          if (isResponseCachable(response)) {
            return store.writeResponse(url, response)
          } else {
            return response
          }
        })
      }
    })
  }

  httpismCache.httpismMiddleware = {
    name: 'cache',
    before: ['debugLog', 'http']
  }

  httpismCache.middleware = 'cache'
  httpismCache.before = ['debugLog', 'http']

  return httpismCache
}

var storeTypes = {
  file: fileStore
}
