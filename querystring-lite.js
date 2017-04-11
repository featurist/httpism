module.exports = {
  parse: function (string) {
    var params = {}

    string.split('&').forEach(function (component) {
      var split = component.split('=')
      if (split[1]) {
        params[decodeURIComponent(split[0])] = decodeURIComponent(split[1])
      }
    })

    return params
  },

  stringify: function (params) {
    return Object.keys(params)
      .filter(function (key) {
        return typeof (params[key]) !== 'undefined'
      })
      .map(function (key) {
        return encodeURIComponent(key) + '=' + encodeURIComponent(params[key])
      })
      .join('&')
  }
}
