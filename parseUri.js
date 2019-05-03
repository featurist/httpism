// from https://gist.github.com/Yaffle/1088850

module.exports = function parseURI (url) {
  var m = String(url).replace(/^\s+|\s+$/g, '').match(/^([^:/?#]+:)?(\/\/(?:([^:@/]*(?::[^:@/]*)?)@)?(([^:/?#]*)(?::(\d*))?))?([^?#]*)(\?[^#]*)?(#[\s\S]*)?/)
  return (m ? {
    href: m[0] || '',
    protocol: m[1] || '',
    authority: m[2] || '',
    auth: decodeURIComponent(m[3] || ''),
    host: m[4] || '',
    hostname: m[5] || '',
    port: m[6] || '',
    pathname: m[7] || '',
    search: m[8] || '',
    hash: m[9] || ''
  } : null)
}
