var client = require('./client')
var http = require('./middleware/http')

module.exports = client([
  require('./middleware/log'),
  require('./middleware/exception'),
  require('./middleware/textServer'),
  require('./middleware/formServer'),
  require('./middleware/jsonServer'),
  require('./middleware/params'),
  require('./middleware/querystring'),
  require('./middleware/basicAuth'),
  require('./middleware/redirect'),
  require('./middleware/cookies'),
  require('./middleware/output'),
  require('./middleware/streamContentType'),
  require('./middleware/debugLog'),
  http
])

module.exports.raw = client(http)
