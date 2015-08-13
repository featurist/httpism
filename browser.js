var httpism = require('./httpism');
var utils = require('./middlewareUtils');
var qs = require('qs');

function json(request, next) {
  if (request.body instanceof Object) {
    setBodyToString(request, JSON.stringify(request.body));
    utils.setHeaderTo(request, "content-type", "application/json");
  }

  utils.setHeaderTo(request, "accept", "application/json");

  return next().then(function(response) {
    if (utils.shouldParseAs(response, "json", request)) {
      response.body = JSON.parse(response.body);
    }
    return response;
  });
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
  r.stringBody = s;
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
  
  if (responseUrl.substring(0, origin.length) == origin) {
    return responseUrl.substring(origin.length);
  } else {
    return responseUrl;
  }
}

function send(request) {
  return new Promise(function (fulfil, reject) {
    var xhr = new XMLHttpRequest();

    xhr.open(request.method, request.url, true);
    xhr.onreadystatechange = function (event) {
      if (xhr.readyState == 4) {
        var response = {
          body: xhr.responseText,
          headers: parseHeaders(xhr.getAllResponseHeaders()),
          statusCode: xhr.status,
          url: responseUrl(xhr, request.url),
          xhr: xhr
        };

        fulfil(response);
      }
    };

    setHeaders(request.headers, xhr);

    xhr.send(request.body);
  });
}

module.exports = httpism(
  undefined,
  {},
  [
    utils.exception,
    form,
    json,
    send
  ]
);
