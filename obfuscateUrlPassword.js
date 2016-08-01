var urlUtils = require("url");

module.exports = function(url) {
  var urlComponents = urlUtils.parse(url);
  if (urlComponents.auth) {
    urlComponents.auth = urlComponents.auth.replace(/:.*/, ':********');

    return urlUtils.format(urlComponents);
  } else {
    return url;
  }
};
