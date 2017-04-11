module.exports = function (x, y) {
  if (x && y) {
    var r = {}

    Object.keys(y).forEach(function (ykey) {
      r[ykey] = y[ykey]
    })

    Object.keys(x).forEach(function (xkey) {
      r[xkey] = x[xkey]
    })

    return r
  } else if (y) {
    return y
  } else {
    return x
  }
}
