var responseBodyTypes = {
  json: function (response) {
    return contentTypeIs(response, 'application/json')
  },
  text: function (response) {
    return contentTypeIsText(response) || contentTypeIs(response, 'application/javascript')
  },
  form: function (response) {
    return contentTypeIs(response, 'application/x-www-form-urlencoded')
  },
  stream: function () {
    return false
  }
}

function contentTypeIsText (response) {
  return contentTypeIs(response, 'text/.*')
}

function contentTypeIs (response, expectedContentType) {
  var re = new RegExp('^\\s*' + expectedContentType + '\\s*($|;)')
  return re.test(response.headers['content-type'])
}

module.exports = function (response, type, request) {
  if (request.options.responseBody) {
    return type === request.options.responseBody
  } else {
    var bodyType = responseBodyTypes[type]
    if (bodyType) {
      return bodyType(response)
    }
  }
}
