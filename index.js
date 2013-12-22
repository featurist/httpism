(function() {
    var self = this;
    var request, urlUtils, Resource;
    request = require("request");
    urlUtils = require("url");
    Resource = function(requester, response, body) {
        var gen1_items, gen2_i, field;
        this.requester = requester || request;
        if (response) {
            gen1_items = [ "body", "statusCode", "headers" ];
            for (gen2_i = 0; gen2_i < gen1_items.length; ++gen2_i) {
                field = gen1_items[gen2_i];
                this[field] = response[field];
            }
            this.url = response.request.href;
            this.body = body;
        }
        return this;
    };
    Resource.prototype = {
        get: function(url, options, continuation) {
            var self = this;
            var gen3_arguments = Array.prototype.slice.call(arguments, 0, arguments.length - 1);
            continuation = arguments[arguments.length - 1];
            if (!(continuation instanceof Function)) {
                throw new Error("asynchronous function called synchronously");
            }
            url = gen3_arguments[0];
            options = gen3_arguments[1];
            self.send("get", url, options, continuation);
        },
        post: function(url, options, continuation) {
            var self = this;
            var gen4_arguments = Array.prototype.slice.call(arguments, 0, arguments.length - 1);
            continuation = arguments[arguments.length - 1];
            if (!(continuation instanceof Function)) {
                throw new Error("asynchronous function called synchronously");
            }
            url = gen4_arguments[0];
            options = gen4_arguments[1];
            self.send("post", url, options, continuation);
        },
        put: function(url, options, continuation) {
            var self = this;
            var gen5_arguments = Array.prototype.slice.call(arguments, 0, arguments.length - 1);
            continuation = arguments[arguments.length - 1];
            if (!(continuation instanceof Function)) {
                throw new Error("asynchronous function called synchronously");
            }
            url = gen5_arguments[0];
            options = gen5_arguments[1];
            self.send("put", url, options, continuation);
        },
        "delete": function(url, options, continuation) {
            var self = this;
            var gen6_arguments = Array.prototype.slice.call(arguments, 0, arguments.length - 1);
            continuation = arguments[arguments.length - 1];
            if (!(continuation instanceof Function)) {
                throw new Error("asynchronous function called synchronously");
            }
            url = gen6_arguments[0];
            options = gen6_arguments[1];
            self.send("delete", url, options, continuation);
        },
        head: function(url, options, continuation) {
            var self = this;
            var gen7_arguments = Array.prototype.slice.call(arguments, 0, arguments.length - 1);
            continuation = arguments[arguments.length - 1];
            if (!(continuation instanceof Function)) {
                throw new Error("asynchronous function called synchronously");
            }
            url = gen7_arguments[0];
            options = gen7_arguments[1];
            self.send("head", url, options, continuation);
        },
        options: function(url, options, continuation) {
            var self = this;
            var gen8_arguments = Array.prototype.slice.call(arguments, 0, arguments.length - 1);
            continuation = arguments[arguments.length - 1];
            if (!(continuation instanceof Function)) {
                throw new Error("asynchronous function called synchronously");
            }
            url = gen8_arguments[0];
            options = gen8_arguments[1];
            self.send("options", url, options, continuation);
        },
        resource: function(url, middleware) {
            var self = this;
            var resource;
            resource = new Resource();
            resource.addMiddleware(middleware || []);
            resource.url = self.relativeUrl(url);
            return resource;
        },
        send: function(method, url, options, callback) {
            var self = this;
            var opts;
            opts = options || {};
            opts.method = method;
            opts.url = self.relativeUrl(url);
            return self.requester(opts, function(err, response, body) {
                if (err) {
                    return callback(err);
                } else {
                    return callback(void 0, new Resource(self.requester, response, body));
                }
            });
        },
        relativeUrl: function(url) {
            var self = this;
            if (self.url && url) {
                return urlUtils.resolve(self.url, url);
            } else if (self.url) {
                return self.url;
            } else {
                return url;
            }
        },
        withMiddleware: function() {
            var self = this;
            var middleware = Array.prototype.slice.call(arguments, 0, arguments.length);
            return self.resource(self.url, middleware);
        },
        addMiddleware: function(middleware) {
            var self = this;
            var gen9_items, gen10_i, wrapper;
            gen9_items = middleware;
            for (gen10_i = 0; gen10_i < gen9_items.length; ++gen10_i) {
                wrapper = gen9_items[gen10_i];
                self.requester = wrapper(self.requester);
            }
            return self;
        },
        withResponseBodyParser: function(contentType, parser) {
            var self = this;
            var parseResponseBody;
            parseResponseBody = function(request) {
                var send;
                return send = function(options, cb) {
                    return request(options, function(err, response, body) {
                        if (response.headers["content-type"] === contentType) {
                            return cb(err, response, parser(body));
                        } else {
                            return cb(err, response, body);
                        }
                    });
                };
            };
            return self.withMiddleware(parseResponseBody);
        }
    };
    module.exports = new Resource();
}).call(this);