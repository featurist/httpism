(function() {
    var self = this;
    var request, urlUtils, interface, relativeTo, createResource, member;
    request = require("request");
    urlUtils = require("url");
    interface = {
        get: function(url, gen1_options, continuation) {
            var self = this;
            var gen2_arguments = Array.prototype.slice.call(arguments, 0, arguments.length - 1);
            continuation = arguments[arguments.length - 1];
            if (!(continuation instanceof Function)) {
                throw new Error("asynchronous function called synchronously");
            }
            url = gen2_arguments[0];
            gen1_options = gen2_arguments[1];
            var headers;
            headers = gen1_options !== void 0 && Object.prototype.hasOwnProperty.call(gen1_options, "headers") && gen1_options.headers !== void 0 ? gen1_options.headers : {};
            var absoluteUrl;
            absoluteUrl = relativeTo(url, self.url);
            request(absoluteUrl, function(gen3_error, gen4_asyncResult) {
                var response;
                if (gen3_error) {
                    continuation(gen3_error);
                } else {
                    try {
                        response = gen4_asyncResult;
                        continuation(void 0, createResource(response));
                    } catch (gen5_exception) {
                        continuation(gen5_exception);
                    }
                }
            });
        },
        post: function(url, body, gen6_options, continuation) {
            var self = this;
            var gen7_arguments = Array.prototype.slice.call(arguments, 0, arguments.length - 1);
            continuation = arguments[arguments.length - 1];
            if (!(continuation instanceof Function)) {
                throw new Error("asynchronous function called synchronously");
            }
            url = gen7_arguments[0];
            body = gen7_arguments[1];
            gen6_options = gen7_arguments[2];
            var headers;
            headers = gen6_options !== void 0 && Object.prototype.hasOwnProperty.call(gen6_options, "headers") && gen6_options.headers !== void 0 ? gen6_options.headers : {};
            continuation(void 0, void 0);
        },
        "delete": function(url, gen8_options, continuation) {
            var self = this;
            var gen9_arguments = Array.prototype.slice.call(arguments, 0, arguments.length - 1);
            continuation = arguments[arguments.length - 1];
            if (!(continuation instanceof Function)) {
                throw new Error("asynchronous function called synchronously");
            }
            url = gen9_arguments[0];
            gen8_options = gen9_arguments[1];
            var headers;
            headers = gen8_options !== void 0 && Object.prototype.hasOwnProperty.call(gen8_options, "headers") && gen8_options.headers !== void 0 ? gen8_options.headers : {};
            continuation(void 0, void 0);
        },
        put: function(url, body, gen10_options, continuation) {
            var self = this;
            var gen11_arguments = Array.prototype.slice.call(arguments, 0, arguments.length - 1);
            continuation = arguments[arguments.length - 1];
            if (!(continuation instanceof Function)) {
                throw new Error("asynchronous function called synchronously");
            }
            url = gen11_arguments[0];
            body = gen11_arguments[1];
            gen10_options = gen11_arguments[2];
            var headers;
            headers = gen10_options !== void 0 && Object.prototype.hasOwnProperty.call(gen10_options, "headers") && gen10_options.headers !== void 0 ? gen10_options.headers : {};
            continuation(void 0, void 0);
        },
        head: function(url, gen12_options, continuation) {
            var self = this;
            var gen13_arguments = Array.prototype.slice.call(arguments, 0, arguments.length - 1);
            continuation = arguments[arguments.length - 1];
            if (!(continuation instanceof Function)) {
                throw new Error("asynchronous function called synchronously");
            }
            url = gen13_arguments[0];
            gen12_options = gen13_arguments[1];
            var headers;
            headers = gen12_options !== void 0 && Object.prototype.hasOwnProperty.call(gen12_options, "headers") && gen12_options.headers !== void 0 ? gen12_options.headers : {};
            continuation(void 0, void 0);
        },
        options: function(url, gen14_options, continuation) {
            var self = this;
            var gen15_arguments = Array.prototype.slice.call(arguments, 0, arguments.length - 1);
            continuation = arguments[arguments.length - 1];
            if (!(continuation instanceof Function)) {
                throw new Error("asynchronous function called synchronously");
            }
            url = gen15_arguments[0];
            gen14_options = gen15_arguments[1];
            var headers;
            headers = gen14_options !== void 0 && Object.prototype.hasOwnProperty.call(gen14_options, "headers") && gen14_options.headers !== void 0 ? gen14_options.headers : {};
            continuation(void 0, void 0);
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
    createResource = function(response) {
        var resource, gen16_items, gen17_i, field;
        resource = Object.create(interface);
        if (response) {
            gen16_items = [ "body", "statusCode", "headers" ];
            for (gen17_i = 0; gen17_i < gen16_items.length; ++gen17_i) {
                field = gen16_items[gen17_i];
                resource[field] = response[field];
            }
            resource.url = response.request.href;
        }
        return resource;
    };
    for (member in interface) {
        (function(member) {
            exports[member] = interface[member];
        })(member);
    }
    exports.resource = function(url) {
        var self = this;
        var resource;
        resource = createResource();
        resource.url = url;
        return resource;
    };
}).call(this);