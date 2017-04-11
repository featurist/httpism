var httpism = require('./httpism')
var middleware = require('./browserMiddleware')
var utils = require('./middlewareUtils')

module.exports = httpism(
  undefined,
  {},
  [
    middleware.jsonp,
    utils.exception,
    middleware.form,
    middleware.json,
    middleware.text,
    utils.expandUrl,
    utils.querystring,
    middleware.send
  ]
)
