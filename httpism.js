var merge = require('./merge');
var resolveUrl = require('./resolveUrl');
var utils = require('./middlewareUtils');

function client(url, options, middlewares) {
  return new Httpism(url, options, middlewares);
}

function Httpism(url, options, middlewares) {
  this.url = url;
  this._options = options;
  this.middlewares = middlewares;
}

Httpism.prototype.send = function(method, url, body, _options, api) {
  var options = merge(_options, this._options)
  var request = {
    method: method,
    url: resolveUrl(this.url, url),
    headers: lowerCaseHeaders(options.headers || {}),
    body: body,
    options: options
  };

  var self = this;

  function sendToMiddleware(index, req) {
    if (index < self.middlewares.length) {
      var middleware = self.middlewares[index];
      return middleware(req, function (nextRequest) { return sendToMiddleware(index + 1, nextRequest || req); }, self);
    }
  }

  return sendToMiddleware(0, request).then(function (response) {
    return makeResponse(self, response);
  }, function (e) {
    if (e.redirectResponse) {
      return e.redirectResponse;
    } else {
      throw e;
    }
  });
};

function lowerCaseHeaders(headers) {
  Object.keys(headers).forEach(function (key) {
    var lower = key.toLowerCase();
    if (key.toLowerCase() != key) {
      headers[lower] = headers[key];
      delete headers[key];
    }
  });

  return headers;
}

function makeResponse(api, response) {
  return utils.extend(new Httpism(api.url, api._options, api.middlewares), response);
}

function insertMiddleware(middlewares, m) {
  for(var n = 0; n < middlewares.length; n++) {
    if (middlewares[n].middleware == m.before) {
      middlewares.splice(n, 0, m);
      return;
    } else if (middlewares[n].middleware == m.after) {
      middlewares.splice(n + 1, 0, m);
      return;
    }
  }

  throw new Error('no such middleware: ' + (m.before || m.after));
}

function extendMiddlewares(originalMiddlewares, newMiddlewares) {
  var middlewares = originalMiddlewares.slice();

  newMiddlewares.forEach(function (m) {
    if (m.before || m.after) {
      insertMiddleware(middlewares, m);
    } else {
      middlewares.unshift(m);
    }
  });

  return middlewares;
}

Httpism.prototype.api = function (url, options, middlewares) {
  var args = parseClientArguments(url, options, middlewares);

  return new Httpism(
    resolveUrl(this.url, args.url),
    merge(args.options, this._options),
    args.middlewares
      ? extendMiddlewares(this.middlewares, args.middlewares)
      : this.middlewares
  );
};

function addMethod(method) {
  Httpism.prototype[method] = function (url, options) {
    return this.send(method, url, undefined, options, this);
  };
}

function addMethodWithBody(method) {
  Httpism.prototype[method] = function (url, body, options) {
    return this.send(method, url, body, options, this);
  };
}

addMethod('get');
addMethod('delete');
addMethod('head');
addMethodWithBody('post');
addMethodWithBody('put');
addMethodWithBody('patch');
addMethodWithBody('options');

function resolveUrl(base, url) {
  if (base) {
    return resolveUrl(base, url);
  } else {
    return url;
  }
}

function parseClientArguments() {
  var url, options, middlewares;

  for(var n = 0; n < arguments.length; n++) {
    var arg = arguments[n];

    if (typeof arg === 'string') {
      url = arg;
    } else if (typeof arg === 'function') {
      middlewares = [arg];
    } else if (arg instanceof Array) {
      middlewares = arg;
    } else if (arg instanceof Object) {
      options = arg;
    }
  }

  return {
    url: url,
    options: options,
    middlewares: middlewares
  };
}

module.exports = client;
