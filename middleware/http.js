var middleware = require('./middleware')
var http = require('http')
var https = require('https')
var proxyForUrl = require('proxy-from-env').getProxyForUrl
var urlUtils = require('url')
var merge = require('../merge')
var HttpsProxyAgent = require('https-proxy-agent')
var obfuscateUrlPassword = require('../obfuscateUrlPassword')

function nodeRequest (request, options, protocol, withResponse) {
  if (protocol === 'https:') {
    return https.request(merge(request, options.https), withResponse)
  } else {
    return http.request(merge(request, options.http), withResponse)
  }
}

function proxyUrl (request, proxy) {
  var url = urlUtils.parse(request.url)
  var proxyUrl = urlUtils.parse(proxy)

  request.headers.host = url.hostname

  if (url.protocol === 'https:') {
    url.agent = new HttpsProxyAgent(proxy)
    return url
  } else {
    if (proxyUrl.auth) {
      request.headers['proxy-authorization'] = 'Basic ' + Buffer.from(proxyUrl.auth).toString('base64')
    }

    return {
      hostname: proxyUrl.hostname,
      port: proxyUrl.port,
      path: request.url
    }
  }
}

function parseUrl (request) {
  var proxy = proxyForUrl(request.url) || request.options.proxy

  if (proxy) {
    return proxyUrl(request, proxy)
  } else {
    return urlUtils.parse(request.url)
  }
}

module.exports = middleware('http', function (request) {
  return new Promise(function (resolve, reject) {
    var url = parseUrl(request)

    var req = nodeRequest(
      {
        hostname: url.hostname,
        port: url.port,
        method: request.method,
        path: url.path,
        headers: request.headers,
        agent: url.agent
      },
      request.options,
      url.protocol,
      function (res) {
        return resolve({
          statusCode: res.statusCode,
          statusText: http.STATUS_CODES[res.statusCode],
          url: request.url,
          headers: res.headers,
          body: res
        })
      }
    )

    if (request.options.timeout) {
      req.setTimeout(request.options.timeout)

      req.on('timeout', function () {
        var msg = request.method.toUpperCase() + ' ' + obfuscateUrlPassword(request.url) + ' => timeout (' + request.options.timeout + 'ms)'
        reject(new Error(msg))
      })
    }

    req.on('error', function (e) {
      reject(e)
    })

    if (request.body) {
      request.body.pipe(req)
    } else {
      req.end()
    }
  })
})
