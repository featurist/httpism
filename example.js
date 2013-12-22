var httpism, google;
httpism = require("./index");
google = httpism.resource("http://google.com/");
google.get("search?q=httpism", function (err, response) {
  if (err) {
    throw err;
  }
  console.log(response.body);
  process.exit(0);
});