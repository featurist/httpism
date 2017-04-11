var client = require('./client')

module.exports = client(
  undefined,
  {},
  [
    require('./middleware/log'),
    require('./middleware/exception'),
    require('./middleware/textServer'),
    require('./middleware/formServer'),
    require('./middleware/jsonServer'),
    require('./middleware/expandUrl'),
    require('./middleware/querystring'),
    require('./middleware/basicAuth'),
    require('./middleware/redirect'),
    require('./middleware/cookies'),
    require('./middleware/streamContentType'),
    require('./middleware/debugLog'),
    require('./middleware/http')
  ]
)

module.exports.raw = client(undefined, {}, [require('./middleware/http')])
