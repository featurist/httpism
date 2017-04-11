module.exports = function (object, extension) {
  var keys = Object.keys(extension)

  for (var n = 0; n < keys.length; n++) {
    var key = keys[n]
    object[key] = extension[key]
  }

  return object
}
