// from https://gist.github.com/Yaffle/1088850

module.exports = function parseURI (url) {
  var m = String(url).replace(/^\s+|\s+$/g, '').match(/^([^:/?#]+:)?(\/\/(?:[^:@]*(?::[^:@]*)?@)?(([^:/?#]*)(?::(\d*))?))?([^?#]*)(\?[^#]*)?(#[\s\S]*)?/)
  // authority = '//' + user + ':' + pass '@' + hostname + ':' port
  return (m ? {
    href: m[0] || '',
    protocol: m[1] || '',
    authority: m[2] || '',
    host: m[3] || '',
    hostname: m[4] || '',
    port: m[5] || '',
    pathname: m[6] || '',
    search: m[7] || '',
    hash: m[8] || ''
  } : null)
}
