var extend = require('./extend')

module.exports = function (x, y) {
  if (x && y) {
    var r = {}

    extend(r, y)
    extend(r, x)

    return r
  } else if (y) {
    return y
  } else {
    return x
  }
}
