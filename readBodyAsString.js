var streamToString = require('./streamToString')

module.exports = function (r) {
  return streamToString(r.body).then(function (string) {
    r.stringBody = string
  })
}
