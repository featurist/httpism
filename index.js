(function() {
    var self = this;
    var request, urlUtils, interface, relativeTo, createResource, makeRequesterFrom, member;
    request = require("request");
    urlUtils = require("url");
    interface = {
        get: function(url, options, continuation) {
            var self = this;
            var gen1_arguments = Array.prototype.slice.call(arguments, 0, arguments.length - 1);
            continuation = arguments[arguments.length - 1];
            if (!(continuation instanceof Function)) {
                throw new Error("asynchronous function called synchronously");
            }
            url = gen1_arguments[0];
            options = gen1_arguments[1];
            self.send("get", url, options, continuation);
        },
        post: function(url, options, continuation) {
            var self = this;
            var gen2_arguments = Array.prototype.slice.call(arguments, 0, arguments.length - 1);
            continuation = arguments[arguments.length - 1];
            if (!(continuation instanceof Function)) {
                throw new Error("asynchronous function called synchronously");
            }
            url = gen2_arguments[0];
            options = gen2_arguments[1];
            self.send("post", url, options, continuation);
        },
        put: function(url, options, continuation) {
            var self = this;
            var gen3_arguments = Array.prototype.slice.call(arguments, 0, arguments.length - 1);
            continuation = arguments[arguments.length - 1];
            if (!(continuation instanceof Function)) {
                throw new Error("asynchronous function called synchronously");
            }
            url = gen3_arguments[0];
            options = gen3_arguments[1];
            self.send("put", url, options, continuation);
        },
        "delete": function(url, options, continuation) {
            var self = this;
            var gen4_arguments = Array.prototype.slice.call(arguments, 0, arguments.length - 1);
            continuation = arguments[arguments.length - 1];
            if (!(continuation instanceof Function)) {
                throw new Error("asynchronous function called synchronously");
            }
            url = gen4_arguments[0];
            options = gen4_arguments[1];
            self.send("delete", url, options, continuation);
        },
        head: function(url, options, continuation) {
            var self = this;
            var gen5_arguments = Array.prototype.slice.call(arguments, 0, arguments.length - 1);
            continuation = arguments[arguments.length - 1];
            if (!(continuation instanceof Function)) {
                throw new Error("asynchronous function called synchronously");
            }
            url = gen5_arguments[0];
            options = gen5_arguments[1];
            self.send("head", url, options, continuation);
        },
        options: function(url, options, continuation) {
            var self = this;
            var gen6_arguments = Array.prototype.slice.call(arguments, 0, arguments.length - 1);
            continuation = arguments[arguments.length - 1];
            if (!(continuation instanceof Function)) {
                throw new Error("asynchronous function called synchronously");
            }
            url = gen6_arguments[0];
            options = gen6_arguments[1];
            self.send("options", url, options, continuation);
        },
        send: function(verb, url, options, callback) {
            var self = this;
            var opts, requester;
            opts = options || {};
            opts.method = verb;
            opts.url = relativeTo(url, self.url);
            requester = self.requester || request;
            return requester(opts, function(err, response, body) {
                if (err) {
                    return callback(err);
                } else {
                    return callback(void 0, createResource(requester, response, body));
                }
            });
        }
    };
    relativeTo = function(url, baseUrl) {
        if (baseUrl && url) {
            return urlUtils.resolve(baseUrl, url);
        } else if (baseUrl) {
            return baseUrl;
        } else {
            return url;
        }
    };
    createResource = function(requester, response, body) {
        var resource, gen7_items, gen8_i, field;
        resource = Object.create(interface);
        resource.requester = requester;
        if (response) {
            gen7_items = [ "body", "statusCode", "headers" ];
            for (gen8_i = 0; gen8_i < gen7_items.length; ++gen8_i) {
                field = gen7_items[gen8_i];
                resource[field] = response[field];
            }
            resource.url = response.request.href;
            resource.body = body;
        }
        return resource;
    };
    makeRequesterFrom = function(middleware) {
        var requester, gen9_items, gen10_i, wrapper;
        requester = request;
        gen9_items = middleware;
        for (gen10_i = 0; gen10_i < gen9_items.length; ++gen10_i) {
            wrapper = gen9_items[gen10_i];
            requester = wrapper(requester);
        }
        return requester;
    };
    for (member in interface) {
        (function(member) {
            exports[member] = interface[member];
        })(member);
    }
    exports.resource = function(url, middleware) {
        var self = this;
        var requester, resource;
        requester = makeRequesterFrom(middleware || []);
        resource = createResource(requester);
        resource.url = url;
        return resource;
    };
}).call(this);