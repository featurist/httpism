nohttp = require './index'

console.log (nohttp ('http://google.com/').get! ().get! ('/asdf'))
console.log (nohttp ('http://google.com/').get! ().body)
