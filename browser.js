var client = require('./client')
var xhr = require('./middleware/xhr')

module.exports = client(
  undefined,
  {},
  [
    require('./middleware/jsonp'),
    require('./middleware/exception'),
    require('./middleware/formBrowser'),
    require('./middleware/jsonBrowser'),
    require('./middleware/textBrowser'),
    require('./middleware/expandUrl'),
    require('./middleware/querystring'),
    xhr
  ]
)

module.exports.raw = client(undefined, {}, [xhr])
