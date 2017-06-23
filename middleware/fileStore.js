var fs = require('fs-promise')
var PassThrough = require('stream').PassThrough
var urlUtils = require('url')

function writeStreamToFile (filename, stream) {
  return new Promise(function (resolve, reject) {
    var file = fs.createWriteStream(filename)
    stream.on('error', reject)
    stream.on('end', resolve)
    stream.pipe(file)
  })
}

module.exports = function (options) {
  var url = typeof options === 'object' && options.hasOwnProperty('url') ? options.url : undefined
  var parsedUrl = urlUtils.parse(url)
  var path = parsedUrl.path

  return {
    filename: function (url) {
      return path + '/' + encodeURIComponent(url)
    },

    responseExists: function (url) {
      return fs.exists(this.filename(url))
    },

    writeResponse: function (url, response) {
      var filename = this.filename(url)
      var body = response.body
      delete response.body

      var fileStream = body.pipe(new PassThrough())
      var responseStream = body.pipe(new PassThrough())

      var responseJson = JSON.stringify(response, null, 2)

      return fs
        .mkdirs(path)
        .then(function () {
          return fs.writeFile(filename + '.json', responseJson)
        })
        .then(function () {
          writeStreamToFile(filename, fileStream).catch(function (e) {
            console.error((e && e.stack) || e)
          })

          response.body = responseStream
          return response
        })
    },

    readResponse: function (url) {
      var filename = this.filename(url)

      return fs.readFile(filename + '.json', 'utf-8').then(function (contents) {
        var response = JSON.parse(contents)
        response.body = fs.createReadStream(filename)
        return response
      })
    }
  }
}
