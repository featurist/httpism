function isObject (x) {
  return typeof x === 'object' && x.constructor === Object
}

module.exports = function deepExtend (x, y) {
  var keys = Object.keys(y)

  for (var n = 0; n < keys.length; n++) {
    var key = keys[n]
    var yValue = y[key]
    var xValue = x[key]

    if (Object.prototype.hasOwnProperty.call(x, key) && isObject(xValue) && isObject(yValue)) {
      var r = {}
      deepExtend(r, xValue)
      deepExtend(r, yValue)
      x[key] = r
    } else if (isObject(yValue)) {
      x[key] = deepExtend({}, yValue)
    } else {
      x[key] = yValue
    }
  }

  return x
}
