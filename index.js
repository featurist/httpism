var middleware = require('./middleware');
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
    middleware.querystring,
    middleware.basicAuth,
    middleware.redirect,
    middleware.cookies,
    middleware.debugLog,
    middleware.http
  ]
);

module.exports.raw = httpism(undefined, {}, [middleware.http]);
