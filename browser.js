var httpism = require('./httpism');
var utils = require('./middlewareUtils');
var qs = require('qs');

function json(request, next) {
  if (request.body instanceof Object) {
    request.body = JSON.stringify(request.body);
    utils.setHeaderTo(request, "content-type", "application/json");
  }

  utils.setHeaderTo(request, "accept", "application/json");

  return next().then(function(response) {
    if (utils.shouldParseAs(response, "json", request)) {
      response.body = JSON.parse(response.body, request.options.jsonReviver);
    }
    return response;
  });
}

function text(request, next) {
  if (typeof request.body === 'string') {
    utils.setHeaderTo(request, "content-type", "text/plain;charset=UTF-8");
  }

  return next();
}

function form(request, next) {
  if (request.options.form && request.body instanceof Object) {
    setBodyToString(request, qs.stringify(request.body));
    utils.setHeaderTo(request, "content-type", "application/x-www-form-urlencoded");
  }

  return next().then(function(response) {
    if (utils.shouldParseAs(response, "form", request)) {
      response.body = qs.parse(response.body);
    }
    return response;
  });
}

function setBodyToString(r, s) {
  r.body = s;
}

function parseHeaders(headers) {
  var object = {};
  var lines = headers.split('\n');

  for(var n = 0; n < lines.length; n++) {
    var line = lines[n];
    var match = /^(.*?):(.*)/.exec(line);

    if (match) {
      object[match[1].toLowerCase()] = match[2].trim();
    }
  }

  return object;
}

function setHeaders(headers, xhr) {
  var headerNames = Object.keys(headers);

  for (var n = 0; n < headerNames.length; n++) {
    var headerName = headerNames[n];
    xhr.setRequestHeader(headerName, headers[headerName]);
  }
}

function responseUrl(xhr, requestUrl) {
  var origin = location.origin;
  var responseUrl = xhr.responseURL;
  
  if (responseUrl) {
    if (responseUrl.substring(0, origin.length) == origin) {
      return responseUrl.substring(origin.length);
    } else {
      return responseUrl;
    }
  } else {
    return requestUrl;
  }
}

function send(request) {
  var xhr = new XMLHttpRequest();
  var reject;

  var promise = new Promise(function (fulfil, _reject) {
    reject = _reject;
    xhr.open(request.method, request.url, true);
    xhr.onload = function (event) {
      var statusCode = xhr.status;

      var response = {
        body: statusCode == 204? undefined: xhr.responseText,
        headers: parseHeaders(xhr.getAllResponseHeaders()),
        statusCode: statusCode,
        url: responseUrl(xhr, request.url),
        xhr: xhr,
        statusText: xhr.statusText
      };

      fulfil(response);
    };

    xhr.onerror = function (error) {
      reject(new Error('failed to connect to ' + request.method + ' ' + request.url));
    };

    if (!isCrossDomain(request.url) && !request.headers['x-requested-with']) {
      request.headers['x-requested-with'] = 'XMLHttpRequest'
    }

    setHeaders(request.headers, xhr);
    xhr.withCredentials = !!request.options.withCredentials;

    xhr.send(request.body);
  });

  function abort() {
    xhr.abort();
    var error = new Error('aborted connection to ' + request.method + ' ' + request.url);
    error.aborted = true;
    reject(error);
  }
  addAbortToPromise(promise, abort);

  return promise;
}

function isCrossDomain(url) {
  return /^https?:\/\//.test(url);
}

function addAbortToPromise(promise, abort) {
  var then = promise.then;
  promise.then = function () {
    var p = then.apply(this, arguments);
    p.abort = abort;
    addAbortToPromise(p, abort);
    return p;
  };
}

module.exports = httpism(
  undefined,
  {},
  [
    utils.exception,
    form,
    json,
    text,
    utils.querystring,
    send
  ]
);
