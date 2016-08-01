var merge = require("./merge");
var querystringLite = require('./querystring-lite');
var obfuscateUrlPassword = require('./obfuscateUrlPassword');

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
  stream: function() {
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

module.exports.shouldParseAs = function(response, type, request) {
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

exports.extend = extend;

exports.exception = function(request, next) {
  return next().then(function(response) {
    if (response.statusCode >= 400 && request.options.exceptions !== false) {
      var msg = request.method.toUpperCase() + " " + obfuscateUrlPassword(request.url) + " => " + response.statusCode + " " + response.statusText;
      var error = extend(new Error(msg), response);
      throw error;
    } else {
      return response;
    }
  });
};

exports.querystring = function(request, next) {
  if (request.options.querystring instanceof Object) {
    var qs = request.options.qs || querystringLite;

    var split = request.url.split("?");
    var path = split[0];
    var querystring = qs.parse(split[1] || '');
    var mergedQueryString = merge(request.options.querystring, querystring);
    request.url = path + "?" + qs.stringify(mergedQueryString);
  }

  return next();
};
