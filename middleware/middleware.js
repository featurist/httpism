module.exports = function (name, fn) {
  fn.httpismMiddleware = {
    name: name
  }
  return fn
}
