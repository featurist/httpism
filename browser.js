var httpism = require('./httpism');
var browserMiddlewareStack = require('./browserMiddlewareStack');

module.exports = httpism(
  undefined,
  {},
  browserMiddlewareStack
);
