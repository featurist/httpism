var middleware = require('./middleware');
var httpism = require('./httpism');
var browserMiddlewareStack = require('./browserMiddlewareStack');

var isElectron = typeof window !== 'undefined';

module.exports = httpism(undefined, {},
  isElectron
  ?
    browserMiddlewareStack
  :
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
      middleware.streamContentType,
      middleware.debugLog,
      middleware.http
    ]
);

module.exports.raw = httpism(undefined, {}, [middleware.http]);
