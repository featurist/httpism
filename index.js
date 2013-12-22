(function() {
    var gen1_continuationOrDefault = function(args) {
        var c = args[args.length - 1];
        if (c instanceof Function) {
            return c;
        } else {
            return function(error, result) {
                if (error) {
                    throw error;
                } else {
                    return result;
                }
            };
        }
    };
    var self = this;
    var request, urlUtils, Resource;
    request = require("request");
    urlUtils = require("url");
    Resource = function(agent, response, body) {
        this.agent = agent || request;
        if (response) {
            this.url = response.request.href;
            this.body = body;
            this.statusCode = response.statusCode;
            this.headers = response.headers;
        }
        return this;
    };
    Resource.prototype = {
        get: function(url, options, continuation) {
            var self = this;
            var gen2_arguments = Array.prototype.slice.call(arguments, 0, arguments.length - 1);
            continuation = gen1_continuationOrDefault(arguments);
            url = gen2_arguments[0];
            options = gen2_arguments[1];
            return self.send("get", url, options, continuation);
        },
        post: function(url, options, continuation) {
            var self = this;
            var gen3_arguments = Array.prototype.slice.call(arguments, 0, arguments.length - 1);
            continuation = gen1_continuationOrDefault(arguments);
            url = gen3_arguments[0];
            options = gen3_arguments[1];
            return self.send("post", url, options, continuation);
        },
        put: function(url, options, continuation) {
            var self = this;
            var gen4_arguments = Array.prototype.slice.call(arguments, 0, arguments.length - 1);
            continuation = gen1_continuationOrDefault(arguments);
            url = gen4_arguments[0];
            options = gen4_arguments[1];
            return self.send("put", url, options, continuation);
        },
        "delete": function(url, options, continuation) {
            var self = this;
            var gen5_arguments = Array.prototype.slice.call(arguments, 0, arguments.length - 1);
            continuation = gen1_continuationOrDefault(arguments);
            url = gen5_arguments[0];
            options = gen5_arguments[1];
            return self.send("delete", url, options, continuation);
        },
        head: function(url, options, continuation) {
            var self = this;
            var gen6_arguments = Array.prototype.slice.call(arguments, 0, arguments.length - 1);
            continuation = gen1_continuationOrDefault(arguments);
            url = gen6_arguments[0];
            options = gen6_arguments[1];
            return self.send("head", url, options, continuation);
        },
        options: function(url, options, continuation) {
            var self = this;
            var gen7_arguments = Array.prototype.slice.call(arguments, 0, arguments.length - 1);
            continuation = gen1_continuationOrDefault(arguments);
            url = gen7_arguments[0];
            options = gen7_arguments[1];
            return self.send("options", url, options, continuation);
        },
        resource: function(url, middleware) {
            var self = this;
            var resource;
            resource = new Resource(self.agent);
            resource.addMiddleware(middleware || []);
            resource.url = self.relativeUrl(url);
            return resource;
        },
        send: function(method, url, options, callback) {
            var self = this;
            var opts;
            if (typeof url === "object") {
                options = url;
                url = self.url;
            }
            opts = options || {};
            opts.method = method;
            opts.url = self.relativeUrl(url);
            return self.agent(opts, function(err, response, body) {
                if (err) {
                    return callback(err);
                } else {
                    return callback(void 0, new Resource(self.agent, response, body));
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
        addMiddleware: function(middleware) {
            var self = this;
            var gen8_items, gen9_i, wrapper;
            gen8_items = middleware;
            for (gen9_i = 0; gen9_i < gen8_items.length; ++gen9_i) {
                wrapper = gen8_items[gen9_i];
                self.agent = wrapper(self.agent);
            }
            return self;
        },
        withMiddleware: function() {
            var self = this;
            var middleware = Array.prototype.slice.call(arguments, 0, arguments.length);
            return self.resource(self.url, middleware);
        },
        use: function(transform) {
            var self = this;
            return self.withMiddleware(function(agent) {
                var send;
                return send = function(options, cb) {
                    return transform(agent, options, cb);
                };
            });
        },
        withRequestTransform: function(transformer) {
            var self = this;
            return self.use(function(agent, options, cb) {
                transformer(options);
                return agent(options, cb);
            });
        },
        withResponseTransform: function(transformer) {
            var self = this;
            return self.use(function(agent, options, cb) {
                return agent(options, function(err, response, body) {
                    return transformer(err, response, body, cb);
                });
            });
        },
        withResponseBodyParser: function(contentType, parser) {
            var self = this;
            return self.withResponseTransform(function(err, response, body, cb) {
                if (!err && response.headers["content-type"] === contentType) {
                    return cb(err, response, parser(body));
                } else {
                    return cb(err, response, body);
                }
            });
        },
        withJsonResponseBodyParser: function() {
            var self = this;
            return self.withResponseBodyParser("application/json", JSON.parse);
        },
        withRequestBodyFormatter: function(formatter) {
            var self = this;
            return self.withRequestTransform(function(options) {
                if (typeof options.body !== "undefined") {
                    return options.body = formatter(options.body);
                }
            });
        }
    };
    module.exports = new Resource();
}).call(this);