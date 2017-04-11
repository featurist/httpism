module.exports = function (url) {
  return url.replace(/^([-a-z]*:\/\/[^:]*:)[^@]*@/, function (_, first) { return first + '********@' })
}
