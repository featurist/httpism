// from https://gist.github.com/Yaffle/1088850

var parseUri = require('./parseUri')

module.exports = function (base, href) { // RFC 3986
  function removeDotSegments (input) {
    var output = []
    input.replace(/^(\.\.?(\/|$))+/, '')
         .replace(/\/(\.(\/|$))+/g, '/')
         .replace(/\/\.\.$/, '/../')
         .replace(/\/?[^/]*/g, function (p) {
           if (p === '/..') {
             output.pop()
           } else {
             output.push(p)
           }
         })
    return output.join('').replace(/^\//, input.charAt(0) === '/' ? '/' : '')
  }

  href = parseUri(href || '')
  base = parseUri(base || '')

  return !href || !base ? null : (href.protocol || base.protocol) +
         (href.protocol || href.authority ? href.authority : base.authority) +
         removeDotSegments(href.protocol || href.authority || href.pathname.charAt(0) === '/' ? href.pathname : (href.pathname ? ((base.authority && !base.pathname ? '/' : '') + base.pathname.slice(0, base.pathname.lastIndexOf('/') + 1) + href.pathname) : base.pathname)) +
         (href.protocol || href.authority || href.pathname ? href.search : (href.search || base.search)) +
         href.hash
}
