var httpism = require("../index");
var express = require("express");
var bodyParser = require("body-parser");
var chai = require("chai");
chai.use(require("chai-as-promised"));
var assert = chai.assert;
var expect = chai.expect;
chai.should();
var http = require('http');
var https = require("https");
var fs = require("fs-promise");
var qs = require("qs");
var middleware = require("../middleware");
var basicAuth = require("basic-auth-connect");
var cookieParser = require("cookie-parser");
var toughCookie = require("tough-cookie");
var httpProxy = require('http-proxy');
var net = require('net');

describe("httpism", function() {
  var server;
  var app;
  var port = 12345;
  var baseurl = "http://localhost:" + port;

  beforeEach(function() {
    app = express();
    server = app.listen(port);
  });

  afterEach(function() {
    server.close();
  });

  describe("json", function() {
    beforeEach(function() {
      app.use(bodyParser.json());
    });

    function itCanMakeRequests(method) {
      it("can make " + method + " requests", function() {
        app[method.toLowerCase()]("/", function(req, res) {
          res.send({
            method: req.method,
            path: req.path,
            accept: req.headers.accept
          });
        });

        return httpism[method.toLowerCase()](baseurl).then(function(response) {
          expect(response.body).to.eql({
            method: method,
            path: "/",
            accept: "application/json"
          });
        });
      });
    }

    it("can make HEAD requests", function() {
      app.head("/", function(req, res) {
        res.header("x-method", req.method);
        res.header("x-path", req.path);
        res.end();
      });

      return httpism.head(baseurl).then(function(response) {
        response.headers["x-method"].should.equal("HEAD");
        response.headers["x-path"].should.equal("/");
      });
    });

    function itCanMakeRequestsWithBody(method) {
      it("can make " + method + " requests with body", function() {
        app[method.toLowerCase()]("/", function(req, res) {
          res.send({
            method: req.method,
            path: req.path,
            accept: req.headers.accept,
            body: req.body
          });
        });

        return httpism[method.toLowerCase()](baseurl, {
          joke: "a chicken..."
        }).then(function(response) {
          response.body.should.eql({
            method: method,
            path: "/",
            accept: "application/json",
            body: {
              joke: "a chicken..."
            }
          });
        });
      });
    }

    itCanMakeRequests("GET");
    itCanMakeRequests("DELETE");
    itCanMakeRequestsWithBody("POST");
    itCanMakeRequestsWithBody("PUT");
    itCanMakeRequestsWithBody("PATCH");
    itCanMakeRequestsWithBody("OPTIONS");

    describe("content type request header", function() {
      beforeEach(function() {
        app.post("/", function(req, res) {
          res.header("received-content-type", req.headers["content-type"]);
          res.header("content-type", "text/plain");
          req.pipe(res);
        });
      });

      it("can upload JSON as application/custom", function() {
        return httpism.post(baseurl, { json: "json" }, { headers: { "content-type": "application/custom" } }).then(function(response) {
          JSON.parse(response.body).should.eql({
            json: "json"
          });
          expect(response.headers["received-content-type"]).to.eql("application/custom");
        });
      });

      it("can upload form as application/custom", function() {
        return httpism.post(baseurl, { json: "json" }, {
            form: true,
            headers: {
                "content-type": "application/custom"
            }
        }).then(function(response) {
          qs.parse(response.body).should.eql({
            json: "json"
          });
          response.headers["received-content-type"].should.eql("application/custom");
        });
      });

      it("can upload string as application/custom", function() {
        return httpism.post(baseurl, "a string", {
          headers: {
            "content-type": "application/custom"
          }
        }).then(function(response) {
          response.body.should.eql("a string");
          response.headers["received-content-type"].should.eql("application/custom");
        });
      });
    });

    describe("content-length header", function() {
      var unicodeText = "♫♫♫♫♪ ☺";

      beforeEach(function() {
        return app.post("/", function(req, res) {
          res.send({
            "content-length": req.headers["content-length"],
            "transfer-encoding": req.headers["transfer-encoding"]
          });
        });
      });

      it("sends content-length, and not transfer-encoding: chunked, with JSON", function() {
        return httpism.post(baseurl, { json: unicodeText }).then(function(response) {
          response.body.should.eql({
            "content-length": Buffer.byteLength(JSON.stringify({
              json: unicodeText
            })).toString()
          });
        });
      });

      it("sends content-length, and not transfer-encoding: chunked, with plain text", function() {
        return httpism.post(baseurl, unicodeText).then(function(response) {
          response.body.should.eql({
            "content-length": Buffer.byteLength(unicodeText).toString()
          });
        });
      });

      it("sends content-length, and not transfer-encoding: chunked, with form data", function() {
        return httpism.post(baseurl, { formData: unicodeText }, {
          form: true
        }).then(function(response) {
          response.body.should.eql({
            "content-length": Buffer.byteLength(qs.stringify({
              formData: unicodeText
            })).toString()
          });
        });
      });
    });

    describe("accept request header", function() {
      beforeEach(function() {
        app.get("/", function(req, res) {
          res.header("content-type", "text/plain");
          res.send(req.headers.accept);
        });
      });

      it("sends Accept: application/json by default", function() {
        return httpism.get(baseurl).then(function(response) {
          response.body.should.eql("application/json");
        });
      });

      it("can send a custom Accept header", function() {
        return httpism.get(baseurl, {
          headers: {
            accept: "application/custom"
          }
        }).then(function(response) {
          response.body.should.eql("application/custom");
        });
      });
    });

    describe("request headers", function() {
      it("can specify headers for the request", function() {
        app.get("/", function(req, res) {
          res.send({
            "x-header": req.headers["x-header"]
          });
        });

        return httpism.get(baseurl, {
          headers: {
            "x-header": "haha"
          }
        }).then(function(response) {
          response.body["x-header"].should.equal("haha");
        });
      });
    });

    describe("text", function() {
      function itReturnsAStringForContentType(mimeType) {
        it("returns a string if the content-type is " + mimeType, function() {
          app.get("/", function(req, res) {
            res.header("content-type", mimeType);
            res.send("content as string");
          });

          return httpism.get(baseurl).then(function(response) {
            response.body.should.equal("content as string");
          });
        });
      }

      itReturnsAStringForContentType("text/plain");
      itReturnsAStringForContentType("text/html");
      itReturnsAStringForContentType("text/css");
      itReturnsAStringForContentType("text/javascript");
      itReturnsAStringForContentType("application/javascript");

      it("will upload a string as text/plain", function() {
        app.post("/text", function(req, res) {
          res.header("received-content-type", req.headers["content-type"]);
          res.header("content-type", "text/plain");
          req.pipe(res);
        });

        return httpism.post(baseurl + "/text", "content as string").then(function(response) {
          response.headers["received-content-type"].should.equal("text/plain");
          response.body.should.equal("content as string");
        });
      });
    });

    describe("query strings", function() {
      beforeEach(function() {
        app.get("/", function(req, res) {
          res.send(req.query);
        });
      });

      it("can set query string", function() {
        return httpism.get(baseurl, {
          querystring: {
            a: "a",
            b: "b"
          }
        }).then(function(response) {
          response.body.should.eql({
            a: "a",
            b: "b"
          });
        });
      });

      it("can override query string in url", function() {
        return httpism.get(baseurl + "/?a=a&c=c", {
          querystring: {
            a: "newa",
            b: "b"
          }
        }).then(function(response) {
          response.body.should.eql({
            a: "newa",
            b: "b",
            c: "c"
          });
        });
      });
    });

    describe("apis", function() {
      it("can make a new client that adds headers", function() {
        app.get("/", function(req, res) {
          res.send({
            joke: req.headers.joke
          });
        });

        var client = httpism.api(function(request, next) {
          request.headers.joke = "a chicken...";
          return next(request);
        });

        return client.get(baseurl).then(function(response) {
          response.body.should.eql({
            joke: "a chicken..."
          });
        });
      });
    });

    describe("exceptions", function() {
      beforeEach(function() {
        app.get("/400", function(req, res) {
          res.status(400).send({
            message: "oh dear"
          });
        });
      });

      it("throws exceptions on 400-500 status codes, by default", function() {
        return httpism.api(baseurl).get("/400").then(function () {
          assert.fail("expected an exception to be thrown");
        }).catch(function(e) {
          e.message.should.equal("GET " + baseurl + "/400 => 400 Bad Request");
          e.statusCode.should.equal(400);
          e.body.message.should.equal("oh dear");
        });
      });

      it("doesn't throw exceptions on 400-500 status codes, when specified", function() {
        return httpism.api(baseurl).get("/400", { exceptions: false }).then(function(response) {
          response.body.message.should.equal("oh dear");
        });
      });

      it("throws if it cannot connect", function() {
        return expect(httpism.get("http://localhost:4001/")).to.eventually.be.rejectedWith("ECONNREFUSED");
      });
    });

    describe("options", function() {
      var client;

      beforeEach(function() {
        client = httpism.api(function(request, next) {
          request.body = request.options;
          return next(request);
        }, { a: "a" });

        app.post("/", function(req, res) {
          res.send(req.body);
        });
      });

      it("clients have options, which can be overwritten on each request", function() {
        var root = client.api(baseurl);
        return root.post("", undefined, { b: "b" }).then(function(response) {
          response.body.should.eql({
            a: "a",
            b: "b"
          });

          return response.post("", undefined, { c: "c" }).then(function(response) {
            response.body.should.eql({
              a: "a",
              c: "c"
            });

            return root.post("", undefined).then(function(response) {
              return response.body.should.eql({
                a: "a"
              });
            });
          });
        });
      });
    });

    describe("responses act as clients", function() {
      var path;

      beforeEach(function() {
        function pathResponse(req, res) {
          res.send({
            path: req.path
          });
        }

        app.get("/", pathResponse);
        app.get("/rootfile", pathResponse);
        app.get("/path/", pathResponse);
        app.get("/path/file", pathResponse);

        var api = httpism.api(baseurl);

        return api.get("/path/").then(function(response) {
          path = response;
        });
      });

      it("resources respond with their url", function() {
        path.url.should.equal(baseurl + "/path/");
        path.body.path.should.equal("/path/");
      });

      it("addresses original resource if url is ''", function() {
        return path.get("").then(function(response) {
          response.body.path.should.equal("/path/");
        });
      });

      it("makes relative sub path", function() {
        return path.get("file").then(function(response) {
          response.body.path.should.equal("/path/file");
        });
      });

      it("addresses root", function() {
        return path.get("/").then(function(response) {
          response.body.path.should.equal("/");
        });
      });

      it("can address ../ paths", function() {
        return path.get("../rootfile").then(function(response) {
          response.body.path.should.equal("/rootfile");
        });
      });

      it("can create new apis from relative paths", function() {
        return path.api("file").get("").then(function(response) {
          response.body.path.should.equal("/path/file");
        });
      });
    });

    describe("redirects", function() {
      beforeEach(function() {
        app.get("/redirecttoredirect", function(req, res) {
          res.redirect("/redirect");
        });

        app.get("/redirect", function(req, res) {
          res.location("/path/");
          res.status(302).send({
            path: req.path
          });
        });
        app.get("/", function(req, res) {
          res.send({
            path: req.path
          });
        });
        app.get("/path/", function(req, res) {
          res.send({
            path: req.path
          });
        });
        app.get("/path/file", function(req, res) {
          res.send({
            path: req.path
          });
        });
      });

      it("follows redirects by default", function() {
        return httpism.get(baseurl + "/redirect").then(function(response) {
          response.body.should.eql({
            path: "/path/"
          });
          response.url.should.eql(baseurl + "/path/");
        });
      });

      function itFollowsRedirects(statusCode) {
        it("follows " + statusCode + " redirects", function() {
          app.get("/" + statusCode, function(req, res) {
            res.location("/path/");
            res.status(statusCode).send();
          });

          return httpism.get(baseurl + "/" + statusCode).then(function(response) {
            response.body.should.eql({
              path: "/path/"
            });
            response.url.should.eql(baseurl + "/path/");
          });
        });
      }

      describe("redirects", function() {
        itFollowsRedirects(300);
        itFollowsRedirects(301);
        itFollowsRedirects(302);
        itFollowsRedirects(303);
        itFollowsRedirects(307);
      });

      it("paths are relative to destination resource", function() {
        return httpism.get(baseurl + "/redirect").then(function(response) {
          return response.get("file").then(function(response) {
            response.body.path.should.equal("/path/file");
          });
        });
      });

      it("follows a more than one redirect", function() {
        return httpism.get(baseurl + "/redirecttoredirect").then(function(response) {
          response.body.should.eql({
            path: "/path/"
          });
          response.url.should.eql(baseurl + "/path/");
        });
      });

      it("doesn't follow redirects when specified", function() {
        return httpism.get(baseurl + "/redirect", {
          redirect: false
        }).then(function(response) {
          response.body.should.eql({
            path: "/redirect"
          });
          response.url.should.eql(baseurl + "/redirect");
          response.headers.location.should.equal("/path/");
          response.statusCode.should.equal(302);
        });
      });
    });

    describe("cookies", function() {
      beforeEach(function() {
        app.use(cookieParser());
        app.get("/setcookie", function(req, res) {
          res.cookie("mycookie", "value");
          res.send({});
        });
        app.get("/getcookie", function(req, res) {
          res.send(req.cookies);
        });
      });

      it("can store cookies and send cookies", function() {
        var cookies = new toughCookie.CookieJar();
        return httpism.get(baseurl + "/setcookie", {
          cookies: cookies
        }).then(function() {
          return httpism.get(baseurl + "/getcookie", {
            cookies: cookies
          }).then(function(response) {
            response.body.should.eql({
              mycookie: "value"
            });
          });
        });
      });

      it("can store cookies and send cookies", function() {
        var api = httpism.api(baseurl, {
          cookies: true
        });
        return api.get(baseurl + "/setcookie").then(function() {
          return api.get(baseurl + "/getcookie").then(function(response) {
            response.body.should.eql({
              mycookie: "value"
            });
          });
        });
      });
    });

    describe("https", function() {
      var httpsServer;
      var httpsPort = 23456;
      var httpsBaseurl = "https://localhost:" + httpsPort + "/";

      beforeEach(function() {
        var credentials = {
          key: fs.readFileSync(__dirname + "/server.key", "utf-8"),
          cert: fs.readFileSync(__dirname + "/server.crt", "utf-8")
        };
        httpsServer = https.createServer(credentials, app);
        httpsServer.listen(httpsPort);
      });

      afterEach(function() {
        httpsServer.close();
      });

      it("can make HTTPS requests", function() {
        app.get("/", function(req, res) {
          res.send({
            protocol: req.protocol
          });
        });

        return httpism.get(httpsBaseurl, { https: { rejectUnauthorized: false } }).then(function(response) {
          response.body.protocol.should.equal("https");
        });
      });
    });

    describe("forms", function() {
      it("can upload application/x-www-form-urlencoded", function() {
        app.post("/form", function(req, res) {
          res.header("content-type", "text/plain");
          res.header("received-content-type", req.headers["content-type"]);
          req.pipe(res);
        });

        return httpism.post(baseurl + "/form", {
          name: "Betty Boo",
          address: "one & two"
        }, {
          form: true
        }).then(function(response) {
          response.body.should.equal("name=Betty%20Boo&address=one%20%26%20two");
          response.headers["received-content-type"].should.equal("application/x-www-form-urlencoded");
        });
      });

      it("can download application/x-www-form-urlencoded", function() {
        app.get("/form", function(req, res) {
          res.header("content-type", "application/x-www-form-urlencoded");
          res.send(qs.stringify({
            name: "Betty Boo",
            address: "one & two"
          }));
        });

        return httpism.get(baseurl + "/form").then(function(response) {
          response.body.should.eql({
            name: "Betty Boo",
            address: "one & two"
          });
          response.headers["content-type"].should.equal("application/x-www-form-urlencoded; charset=utf-8");
        });
      });
    });

    describe("basic authentication", function() {
      beforeEach(function() {
        app.use(basicAuth(function(user, pass) {
          return user === "good user" && pass === "good password!";
        }));
        return app.get("/secret", function(req, res) {
          res.send("this is secret");
        });
      });

      it("can authenticate using username password", function() {
        return httpism.get(baseurl + "/secret", {
          basicAuth: {
            username: "good user",
            password: "good password!"
          }
        }).then(function(response) {
          response.body.should.equal("this is secret");
        });
      });

      it("can authenticate using username password encoded in URL", function() {
        var u = encodeURIComponent;
        return httpism.get("http://" + u("good user") + ":" + u("good password!") + "@localhost:" + port + "/secret").then(function(response) {
          response.body.should.equal("this is secret");
        });
      });

      it("can authenticate using username with colons :", function() {
        return httpism.get(baseurl + "/secret", {
          basicAuth: {
            username: "good: :user",
            password: "good password!"
          }
        }).then(function(response) {
          response.body.should.equal("this is secret");
        });
      });

      it("fails to authenticate when password is incorrect", function() {
        return httpism.get(baseurl + "/secret", {
          basicAuth: {
            username: "good user",
            password: "bad password!"
          },
          exceptions: false
        }).then(function(response) {
          response.statusCode.should.equal(401);
        });
      });
    });
  });

  describe("streams", function() {
    var filename = __dirname + "/afile.txt";

    beforeEach(function() {
      return fs.writeFile(filename, "some content").then(function () {
        app.post("/file", function(req, res) {
          res.header("content-type", "text/plain");
          res.header("received-content-type", req.headers["content-type"]);
          req.unshift("received: ");
          req.pipe(res);
        });

        app.get("/file", function(req, res) {
          var stream;
          stream = fs.createReadStream(filename);
          res.header("content-type", "application/blah");
          stream.pipe(res);
        });
      });
    });

    afterEach(function() {
      return fs.unlink(filename);
    });

    function itCanUploadAStreamWithContentType(contentType) {
      it("can upload a stream with Content-Type: " + contentType, function() {
        var stream = fs.createReadStream(filename);

        return httpism.post(baseurl + "/file", stream, {
          headers: {
            "content-type": contentType
          }
        }).then(function(response) {
          response.headers["received-content-type"].should.equal(contentType);
          response.body.should.equal("received: some content");
        });
      });
    }

    itCanUploadAStreamWithContentType("application/blah");
    itCanUploadAStreamWithContentType("application/json");
    itCanUploadAStreamWithContentType("text/plain");
    itCanUploadAStreamWithContentType("application/x-www-form-urlencoded");

    it("can download a stream", function() {
      return httpism.get(baseurl + "/file").then(function(response) {
        response.headers["content-type"].should.equal("application/blah");
        return middleware.streamToString(response.body).then(function(response) {
          response.should.equal("some content");
        });
      });
    });

    describe("forcing response parsing", function() {
      function describeForcingResponse(type, options) {
        var contentType = options !== undefined && Object.prototype.hasOwnProperty.call(options, "contentType") && options.contentType !== undefined ? options.contentType : undefined;
        var content = options !== undefined && Object.prototype.hasOwnProperty.call(options, "content") && options.content !== undefined ? options.content : undefined;
        var sendContent = options !== undefined && Object.prototype.hasOwnProperty.call(options, "sendContent") && options.sendContent !== undefined ? options.sendContent : undefined;

        describe(type, function() {
          it("can download a stream of content-type " + contentType, function() {
            app.get("/content", function(req, res) {
              var stream = fs.createReadStream(filename);
              res.header("content-type", contentType);
              stream.pipe(res);
            });

            return httpism.get(baseurl + "/content", {
              responseBody: "stream"
            }).then(function(response) {
              response.headers["content-type"].should.equal(contentType);
              return middleware.streamToString(response.body).then(function(response) {
                response.should.equal("some content");
              });
            });
          });

          it("can force parse " + type + " when content-type is application/blah", function() {
            app.get("/content", function(req, res) {
              res.header("content-type", "application/blah");
              res.send(sendContent || content);
            });

            return httpism.get(baseurl + "/content", {
              responseBody: type
            }).then(function(response) {
              response.headers["content-type"].should.equal("application/blah; charset=utf-8");
              response.body.should.eql(content);
            });
          });
        });
      }

      describeForcingResponse("text", {
        contentType: "text/plain; charset=utf-8",
        content: "some text content"
      });
      describeForcingResponse("json", {
        contentType: "application/json",
        content: {
          json: true
        }
      });
      describeForcingResponse("form", {
        contentType: "application/x-www-form-urlencoded",
        content: {
          json: "true"
        },
        sendContent: qs.stringify({
          json: "true"
        })
      });
    });
  });

  describe('proxy', function () {
    var proxyServer;
    var proxyPort = 12346;
    var proxy;
    var urlProxied;
    var proxyAuth = false;
    var proxyUrl = 'http://localhost:' + proxyPort + '/';
    var secureProxyUrl = 'http://bob:secret@localhost:' + proxyPort + '/';

    function proxyRequest(req, res) {
      urlProxied = req.url;
      proxy.web(req, res, { target: req.url });
    }

    function checkProxyAuthentication(req, res, next) {
      var expectedAuthorisation = 'Basic ' + new Buffer('bob:secret').toString('base64');

      if (expectedAuthorisation == req.headers['proxy-authorization']) {
        next(req, res);
      } else {
        res.statusCode = 407;
        res.end('bad proxy authentication');
      }
    }

    beforeEach(function() {
      urlProxied = undefined;
      proxy = httpProxy.createProxyServer();

      proxyServer = http.createServer(function (req, res) {
        if (proxyAuth) {
          return checkProxyAuthentication(req, res, proxyRequest);
        } else {
          return proxyRequest(req, res);
        }
      });
      proxyServer.listen(proxyPort);

      proxyServer.on('connect', function(req, socket) {
        var addr = req.url.split(':');
        //creating TCP connection to remote server
        var conn = net.connect(addr[1] || 443, addr[0], function() {
          // tell the client that the connection is established
          socket.write('HTTP/' + req.httpVersion + ' 200 OK\r\n\r\n', 'UTF-8', function() {
            // creating pipes in both ends
            conn.pipe(socket);
            socket.pipe(conn);
          });
        });

        conn.on('error', function(e) {
          console.log("Server connection error: " + e, addr);
          socket.end();
        });
      });
    });

    afterEach(function() {
      proxyServer.close();
    });

    var httpsServer;
    var httpsPort = 23456;
    var httpsBaseurl = "https://localhost:" + httpsPort + "/";

    beforeEach(function() {
      var credentials = {
        key: fs.readFileSync(__dirname + "/server.key", "utf-8"),
        cert: fs.readFileSync(__dirname + "/server.crt", "utf-8")
      };
      httpsServer = https.createServer(credentials, app);
      httpsServer.listen(httpsPort);
    });

    afterEach(function() {
      httpsServer.close();
    });

    context('unsecured proxy', function () {

      it('can use a proxy', function () {
        app.get("/", function(req, res) {
          res.send({
            blah: "blah"
          });
        });

        return httpism.get(baseurl, {proxy: proxyUrl}).then(function (response) {
          expect(response.body).to.eql({blah: 'blah'});
          expect(urlProxied).to.equal(baseurl);
        });
      });

      it("can make HTTPS requests", function() {
        app.get("/", function(req, res) {
          res.send({
            protocol: req.protocol
          });
        });

        return httpism.get(httpsBaseurl, { proxy: proxyUrl, https: { rejectUnauthorized: false } }).then(function(response) {
          response.body.protocol.should.equal("https");
        });
      });
    });

    context('secured proxy', function () {
      it('can use a proxy', function () {
        app.get("/", function(req, res) {
          res.send({
            blah: "blah"
          });
        });

        return httpism.get(baseurl, {proxy: secureProxyUrl}).then(function (response) {
          expect(response.body).to.eql({blah: 'blah'});
          expect(urlProxied).to.equal(baseurl);
        });
      });

      it("can make HTTPS requests", function() {
        app.get("/", function(req, res) {
          res.send({
            protocol: req.protocol
          });
        });

        return httpism.get(httpsBaseurl, { proxy: secureProxyUrl, https: { rejectUnauthorized: false } }).then(function(response) {
          response.body.protocol.should.equal("https");
        });
      });
    });
  });

  describe("raw", function() {
    it("can be used to create new middleware pipelines", function() {
      app.get("/", function(req, res) {
        res.status(400).send({
          blah: "blah"
        });
      });

      var api = httpism.raw.api(baseurl, function(request, next) {
        return next().then(function(res) {
          return middleware.streamToString(res.body).then(function(response) {
            res.body = response;
            return res;
          });
        });
      });

      return api.get(baseurl).then(function(response) {
        response.statusCode.should.equal(400);
        JSON.parse(response.body).should.eql({
          blah: "blah"
        });
      });
    });
  });

  describe("json reviver", function() {

    it("controls how the JSON response is deserialised", function() {
      app.get("/", function(req, res) {
        res.status(200).send({ blah: 1234 });
      });

      var api = httpism.api(baseurl, {
        jsonReviver: function(key, value) {
          if (key == '') { return value; }
          return key + value + '!';
        }
      });

      return api.get(baseurl).then(function(response) {
        response.statusCode.should.equal(200);
        response.body.should.eql({
          blah: "blah1234!"
        });
      });
    });

  });
});
