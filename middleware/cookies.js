var middleware = require('./middleware')

function storeCookies (cookies, url, header) {
  if (header) {
    var headers =
      header instanceof Array
        ? header
        : [header]

    headers.forEach(function (setCookieHeader) {
      cookies.setCookieSync(setCookieHeader, url)
    })
  }
}

module.exports = middleware('cookies', function (request, next, client) {
  var cookies

  if (client._options.cookies === true) {
    var toughCookie = require('tough-cookie')
    cookies = request.options.cookies = client._options.cookies = new toughCookie.CookieJar()
  } else {
    cookies = request.options.cookies
  }

  if (cookies) {
    request.headers.cookie = cookies.getCookieStringSync(request.url)
    return next().then(function (response) {
      storeCookies(cookies, response.url, response.headers['set-cookie'])
      return response
    })
  } else {
    return next()
  }
})
