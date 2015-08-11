var Promise = require("bluebird");
var http = require("http");
var https = require("https");
var urlUtils = require("url");
var _ = require("underscore");
var merge = require("./merge");
var qs = require("qs");
var createDebug = require("debug");
var debug = createDebug("httpism");
var debugResponse = createDebug("httpism:response");
var debugRequest = createDebug("httpism:request");

exports.streamToString = function(s) {
  return new Promise(function(result, error) {
    s.setEncoding("utf-8");
    var strings = [];

    s.on("data", function(d) {
      strings.push(d);
    });

    s.on("end", function() {
      result(strings.join(""));
    });

    s.on("error", function(e) {
      error(e);
    });
  });
};

exports.consumeStream = function(s) {
  return new Promise(function(result, error) {
    s.on("end", function() {
      result();
    });

    s.on("error", function(e) {
      error(e);
    });

    s.resume();
  });
};

function contentTypeIs(response, expectedContentType) {
  var re = new RegExp("^\\s*" + expectedContentType + "\\s*($|;)");
  return re.test(response.headers["content-type"]);
}

exports.contentTypeIs = contentTypeIs;

function contentTypeIsText(response) {
  return contentTypeIs(response, "text/.*");
}

exports.contentTypeIsText = contentTypeIsText;

function isStream(body) {
  return body !== undefined && typeof body.pipe === 'function';
}

function shouldParseAs(response, type, request, options) {
  var contentType = options !== undefined && options.hasOwnProperty(options, "contentType") && options.contentType !== undefined ? options.contentType : undefined;

  if (request.options.responseBody) {
    return type === request.options.responseBody;
  } else {
    var bodyType = responseBodyTypes[type];
    if (bodyType) {
      return bodyType(response);
    }
  }
}

var responseBodyTypes = {
  json: function(response) {
    return contentTypeIs(response, "application/json");
  },
  text: function(response) {
    return contentTypeIsText(response) || contentTypeIs(response, "application/javascript");
  },
  form: function(response) {
    return contentTypeIs(response, "application/x-www-form-urlencoded");
  },
  stream: function(response) {
    return false;
  }
};

exports.json = function(request, next) {
  if (request.body instanceof Object && !isStream(request.body)) {
    setBodyToString(request, JSON.stringify(request.body));
    setHeaderTo(request, "content-type", "application/json");
  }

  setHeaderTo(request, "accept", "application/json");

  return next().then(function(response) {
    if (shouldParseAs(response, "json", request)) {
      return exports.streamToString(response.body).then(function(jsonString) {
        response.body = JSON.parse(jsonString);
        return response;
      });
    } else {
      return response;
    }
  });
};

function setBodyToString(r, s) {
  r.body = stringToStream(s);
  r.headers["content-length"] = Buffer.byteLength(s, "utf-8");
  r.stringBody = s;
}

function stringToStream(s) {
  return {
    pipe: function(stream) {
      stream.write(s);
      stream.end();
    }
  };
}

exports.stringToStream = stringToStream;

exports.exception = function(request, next) {
  return next().then(function(response) {
    if (response.statusCode >= 400 && request.options.exceptions !== false) {
      var msg = request.method.toUpperCase() + " " + request.url + " => " + response.statusCode + " " + http.STATUS_CODES[response.statusCode];
      var error = _.extend(new Error(msg), response);
      throw error;
    } else {
      return response;
    }
  });
};

function nodeRequest(request, options, protocol, withResponse) {
  if (protocol === "https:") {
    return https.request(merge(request, options.https), withResponse);
  } else {
    return http.request(merge(request, options.http), withResponse);
  }
}

exports.nodeSend = function(request) {
  return new Promise(function(result, error) {
    var url = urlUtils.parse(request.url);

    var req = nodeRequest(
      {
        hostname: url.hostname,
        port: url.port,
        method: request.method,
        path: url.path,
        headers: request.headers
      },
      request.options,
      url.protocol,
      function(res) {
        return result({
          statusCode: res.statusCode,
          url: request.url,
          headers: res.headers,
          body: res
        });
      }
    );

    req.on("error", function(e) {
      error(e);
    });

    if (request.body) {
      request.body.pipe(req);
    } else {
      req.end();
    }
  });
};

function logRequest(request) {
  debugRequest(request);
}

exports.log = function(request, next) {
  logRequest(request);

  return next().then(function(response) {
    logResponse(response);
    return response;
  }, function(e) {
    var res = _.extend({}, e);
    logResponse(res);
    throw e;
  });
};

function logResponse(response) {
  if (!response.redirectResponse) {
    var responseToLog =
      isStream(response.body)
        ? _.omit(response, "body")
        : _.omit(response);

    debugResponse(responseToLog);
  }
}

exports.redirect = function(request, next, api) {
  return next().then(function(response) {
    var statusCode = response.statusCode;
    var location = response.headers.location;

    if (request.options.redirect !== false && location && (statusCode === 300 || statusCode === 301 || statusCode === 302 || statusCode === 303 || statusCode === 307)) {
      return exports.consumeStream(response.body).then(function() {
        logResponse(response);
        return api.get(urlUtils.resolve(request.url, location), request.options).then(function(redirectResponse) {
          throw {
            redirectResponse: redirectResponse
          };
        });
      });
    } else {
      return response;
    }
  });
};

function loadCookies(cookies, url) {
  return cookies.getCookieStringSync(url);
}

function storeCookies(cookies, url, header) {
  if (header) {
    var headers =
      header instanceof Array
        ? header
        : [header];

    headers.forEach(function (setCookieHeader) {
      cookies.setCookieSync(setCookieHeader, url);
    });
  }
}

exports.cookies = function (request, next) {
  var cookies = request.options.cookies;

  if (cookies) {
    request.headers.cookie = loadCookies(cookies, request.url);
    return next().then(function (response) {
      storeCookies(cookies, response.url, response.headers['set-cookie']);
      return response;
    });
  } else {
    return next();
  }
};

exports.headers = function(request, next) {
  if (request.options.headers) {
    request.headers = merge(request.options.headers, request.headers);
  }

  return next();
};

exports.text = function(request, next) {
  if (typeof request.body === "string") {
      setBodyToString(request, request.body);
      setHeaderTo(request, "content-type", "text/plain");
  }

  return next().then(function(response) {
    if (shouldParseAs(response, "text", request)) {
      return exports.streamToString(response.body).then(function(body) {
        response.body = body;
        return response;
      });
    } else {
      return response;
    }
  });
};

function setHeaderTo(request, header, value) {
  if (!request.headers[header]) {
    return request.headers[header] = value;
  }
}

exports.form = function(request, next) {
  if (request.options.form && request.body instanceof Object && !isStream(request.body)) {
    setBodyToString(request, qs.stringify(request.body));
    setHeaderTo(request, "content-type", "application/x-www-form-urlencoded");
  }

  return next().then(function(response) {
    if (shouldParseAs(response, "form", request)) {
      return exports.streamToString(response.body).then(function(body) {
        response.body = qs.parse(body);
        return response;
      });
    } else {
      return response;
    }
  });
};

exports.querystring = function(request, next) {
  if (request.options.querystring instanceof Object) {
    var split = request.url.split("?");
    var path = split[0];
    var querystring = qs.parse(split[1]);
    var mergedQueryString = merge(request.options.querystring, querystring);
    request.url = path + "?" + qs.stringify(mergedQueryString);
  }

  return next();
};

exports.basicAuth = function(request, next) {
  function encodeBasicAuthorizationHeader(s) {
    return "Basic " + new Buffer(s).toString("base64");
  }

  function basicAuthorizationHeader() {
    if (request.options.basicAuth) {
      return encodeBasicAuthorizationHeader(request.options.basicAuth.username.replace(/:/g, "") + ":" + request.options.basicAuth.password);
    } else {
      var url = urlUtils.parse(request.url);
      if (url.auth) {
        return encodeBasicAuthorizationHeader(url.auth);
      }
    }
  }

  var header = basicAuthorizationHeader();
  if (header) {
    request.headers.authorization = header;
  }

  return next();
};
