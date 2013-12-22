httpism = require './index'

google = httpism.resource 'http://google.com/'
search results = google.get! 'search?q=httpism'
console.log (search results.body)

process.exit 0
