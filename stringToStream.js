module.exports = function (s) {
  return {
    pipe: function (stream) {
      stream.write(s)
      stream.end()
    }
  }
}
