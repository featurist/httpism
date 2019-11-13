var middleware = require('./middleware')
var logError = require('debug')('httpism:error')
var logDetailError = require('debug')('httpism:response:error')
var exceptionMiddleware = require('./exception')(logError, logDetailError)

module.exports = middleware('exception', exceptionMiddleware)
