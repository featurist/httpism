httpism = require './index'

console.log (httpism ('http://google.com/').get! ().get! ('/asdf'))
console.log (httpism ('http://google.com/').get! ().body)
