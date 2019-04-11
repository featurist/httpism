var stringToStream = require('./stringToStream')

module.exports = function (r, s) {
  r.body = stringToStream(s)
  r.headers['content-length'] = Buffer.byteLength(s, 'utf-8')
  r.stringBody = s
}
