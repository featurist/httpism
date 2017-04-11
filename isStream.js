module.exports = function (body) {
  return body !== undefined && typeof body.pipe === 'function'
}
