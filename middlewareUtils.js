var merge = require("./merge");
var createDebug = require("debug");
var debug = createDebug("httpism");
var debugResponse = createDebug("httpism:response");
var debugRequest = createDebug("httpism:request");

module.exports.setHeaderTo = function (request, header, value) {
  if (!request.headers[header]) {
    return request.headers[header] = value;
  }
};

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

function contentTypeIs(response, expectedContentType) {
  var re = new RegExp("^\\s*" + expectedContentType + "\\s*($|;)");
  return re.test(response.headers["content-type"]);
}

function contentTypeIsText(response) {
  return contentTypeIs(response, "text/.*");
}

module.exports.shouldParseAs = function(response, type, request, options) {
  var contentType = options !== undefined && options.hasOwnProperty(options, "contentType") && options.contentType !== undefined ? options.contentType : undefined;

  if (request.options.responseBody) {
    return type === request.options.responseBody;
  } else {
    var bodyType = responseBodyTypes[type];
    if (bodyType) {
      return bodyType(response);
    }
  }
};

function extend(object, extension) {
  var keys = Object.keys(extension);

  for (var n = 0; n < keys.length; n++) {
    var key = keys[n];
    object[key] = extension[key];
  }

  return object;
}

function logRequest(request) {
  debugRequest(request);
}

exports.log = function(request, next) {
  logRequest(request);

  return next().then(function(response) {
    logResponse(response);
    return response;
  }, function(e) {
    var res = extend({}, e);
    logResponse(res);
    throw e;
  });
};

module.exports.isStream = function (body) {
  return body !== undefined && typeof body.pipe === 'function';
}

function logResponse(response) {
  if (!response.redirectResponse) {
    var responseToLog = extend({}, response);
    if (module.exports.isStream(response.body)) {
      delete responseToLog.body;
    }

    debugResponse(responseToLog);
  }
}

module.exports.logResponse = logResponse;

exports.exception = function(request, next) {
  return next().then(function(response) {
    if (response.statusCode >= 400 && request.options.exceptions !== false) {
      var msg = request.method.toUpperCase() + " " + request.url + " => " + response.statusCode + " " + STATUS_CODES[response.statusCode];
      var error = extend(new Error(msg), response);
      throw error;
    } else {
      return response;
    }
  });
};

var STATUS_CODES = {
  100 : 'Continue',
  101 : 'Switching Protocols',
  102 : 'Processing',                 // RFC 2518, obsoleted by RFC 4918
  200 : 'OK',
  201 : 'Created',
  202 : 'Accepted',
  203 : 'Non-Authoritative Information',
  204 : 'No Content',
  205 : 'Reset Content',
  206 : 'Partial Content',
  207 : 'Multi-Status',               // RFC 4918
  300 : 'Multiple Choices',
  301 : 'Moved Permanently',
  302 : 'Moved Temporarily',
  303 : 'See Other',
  304 : 'Not Modified',
  305 : 'Use Proxy',
  307 : 'Temporary Redirect',
  308 : 'Permanent Redirect',         // RFC 7238
  400 : 'Bad Request',
  401 : 'Unauthorized',
  402 : 'Payment Required',
  403 : 'Forbidden',
  404 : 'Not Found',
  405 : 'Method Not Allowed',
  406 : 'Not Acceptable',
  407 : 'Proxy Authentication Required',
  408 : 'Request Time-out',
  409 : 'Conflict',
  410 : 'Gone',
  411 : 'Length Required',
  412 : 'Precondition Failed',
  413 : 'Request Entity Too Large',
  414 : 'Request-URI Too Large',
  415 : 'Unsupported Media Type',
  416 : 'Requested Range Not Satisfiable',
  417 : 'Expectation Failed',
  418 : 'I\'m a teapot',              // RFC 2324
  422 : 'Unprocessable Entity',       // RFC 4918
  423 : 'Locked',                     // RFC 4918
  424 : 'Failed Dependency',          // RFC 4918
  425 : 'Unordered Collection',       // RFC 4918
  426 : 'Upgrade Required',           // RFC 2817
  428 : 'Precondition Required',      // RFC 6585
  429 : 'Too Many Requests',          // RFC 6585
  431 : 'Request Header Fields Too Large',// RFC 6585
  500 : 'Internal Server Error',
  501 : 'Not Implemented',
  502 : 'Bad Gateway',
  503 : 'Service Unavailable',
  504 : 'Gateway Time-out',
  505 : 'HTTP Version Not Supported',
  506 : 'Variant Also Negotiates',    // RFC 2295
  507 : 'Insufficient Storage',       // RFC 4918
  509 : 'Bandwidth Limit Exceeded',
  510 : 'Not Extended',               // RFC 2774
  511 : 'Network Authentication Required' // RFC 6585
};
