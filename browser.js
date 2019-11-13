var client = require('./client')
var xhr = require('./middleware/xhr')

module.exports = client([
  require('./middleware/jsonp'),
  require('./middleware/browserException'),
  require('./middleware/formBrowser'),
  require('./middleware/jsonBrowser'),
  require('./middleware/textBrowser'),
  require('./middleware/params'),
  require('./middleware/querystring'),
  require('./middleware/basicAuth'),
  xhr
])

module.exports.raw = client(xhr)
