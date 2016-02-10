var middleware = require('./middleware');
var utils = require('./middlewareUtils');
var httpism = require('./httpism');

module.exports = httpism(
  undefined,
  {},
  [
    middleware.log,
    middleware.exception,
    middleware.text,
    middleware.form,
    middleware.json,
    utils.querystring,
    middleware.basicAuth,
    middleware.redirect,
    middleware.cookies,
    middleware.debugLog,
    middleware.nodeSend
  ]
);

module.exports.raw = httpism(undefined, {}, [middleware.nodeSend]);
