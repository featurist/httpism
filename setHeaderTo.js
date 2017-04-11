module.exports = function (request, header, value) {
  if (!request.headers[header]) {
    return (request.headers[header] = value)
  }
}
