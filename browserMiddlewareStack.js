var utils = require('./middlewareUtils');
var middleware = require('./browserMiddleware');

module.exports = [
  middleware.jsonp,
  utils.exception,
  middleware.form,
  middleware.json,
  middleware.text,
  utils.querystring,
  middleware.send
];
