module.exports = function (s) {
  return new Promise(function (resolve, reject) {
    s.setEncoding('utf-8')
    var strings = []

    s.on('data', function (d) {
      strings.push(d)
    })

    s.on('end', function () {
      resolve(strings.join(''))
    })

    s.on('error', function (e) {
      reject(e)
    })
  })
}
