var middleware = require('./middleware')
var exceptionMiddleware = require('./exception')()

module.exports = middleware('exception', exceptionMiddleware)
