((function() {
    var self = this;
    var request, urlUtils, resource, relativeTo, createResource, field;
    request = require("request");
    urlUtils = require("url");
    resource = {
        get: function(url, gen1_options, gen2_callback) {
            var self = this;
            var gen3_arguments = Array.prototype.slice.call(arguments, 0, arguments.length - 1);
            gen2_callback = arguments[arguments.length - 1];
            url = gen3_arguments[0];
            gen1_options = gen3_arguments[1];
            var headers;
            headers = gen1_options !== void 0 && Object.prototype.hasOwnProperty.call(gen1_options, "headers") && gen1_options.headers !== void 0 ? gen1_options.headers : {};
            var absoluteUrl;
            absoluteUrl = relativeTo(url, self.url);
            request(absoluteUrl, function(gen4_error, gen5_asyncResult) {
                var response;
                if (gen4_error) {
                    gen2_callback(gen4_error);
                } else {
                    try {
                        response = gen5_asyncResult;
                        gen2_callback(void 0, createResource(response));
                    } catch (gen6_exception) {
                        gen2_callback(gen6_exception);
                    }
                }
            });
        },
        post: function(url, body, gen7_options, gen2_callback) {
            var self = this;
            var gen8_arguments = Array.prototype.slice.call(arguments, 0, arguments.length - 1);
            gen2_callback = arguments[arguments.length - 1];
            url = gen8_arguments[0];
            body = gen8_arguments[1];
            gen7_options = gen8_arguments[2];
            var headers;
            headers = gen7_options !== void 0 && Object.prototype.hasOwnProperty.call(gen7_options, "headers") && gen7_options.headers !== void 0 ? gen7_options.headers : {};
            request({
                url: relativeTo(url, self.url),
                method: "POST",
                body: body
            }, function(gen9_error, gen10_asyncResult) {
                var response;
                if (gen9_error) {
                    gen2_callback(gen9_error);
                } else {
                    try {
                        response = gen10_asyncResult;
                        gen2_callback(void 0, createResource(response));
                    } catch (gen11_exception) {
                        gen2_callback(gen11_exception);
                    }
                }
            });
        },
        "delete": function(url, gen12_options, gen2_callback) {
            var self = this;
            var gen13_arguments = Array.prototype.slice.call(arguments, 0, arguments.length - 1);
            gen2_callback = arguments[arguments.length - 1];
            url = gen13_arguments[0];
            gen12_options = gen13_arguments[1];
            var headers;
            headers = gen12_options !== void 0 && Object.prototype.hasOwnProperty.call(gen12_options, "headers") && gen12_options.headers !== void 0 ? gen12_options.headers : {};
            gen2_callback(void 0, void 0);
        },
        put: function(url, body, gen14_options, gen2_callback) {
            var self = this;
            var gen15_arguments = Array.prototype.slice.call(arguments, 0, arguments.length - 1);
            gen2_callback = arguments[arguments.length - 1];
            url = gen15_arguments[0];
            body = gen15_arguments[1];
            gen14_options = gen15_arguments[2];
            var headers;
            headers = gen14_options !== void 0 && Object.prototype.hasOwnProperty.call(gen14_options, "headers") && gen14_options.headers !== void 0 ? gen14_options.headers : {};
            gen2_callback(void 0, void 0);
        },
        head: function(url, gen16_options, gen2_callback) {
            var self = this;
            var gen17_arguments = Array.prototype.slice.call(arguments, 0, arguments.length - 1);
            gen2_callback = arguments[arguments.length - 1];
            url = gen17_arguments[0];
            gen16_options = gen17_arguments[1];
            var headers;
            headers = gen16_options !== void 0 && Object.prototype.hasOwnProperty.call(gen16_options, "headers") && gen16_options.headers !== void 0 ? gen16_options.headers : {};
            gen2_callback(void 0, void 0);
        },
        options: function(url, gen18_options, gen2_callback) {
            var self = this;
            var gen19_arguments = Array.prototype.slice.call(arguments, 0, arguments.length - 1);
            gen2_callback = arguments[arguments.length - 1];
            url = gen19_arguments[0];
            gen18_options = gen19_arguments[1];
            var headers;
            headers = gen18_options !== void 0 && Object.prototype.hasOwnProperty.call(gen18_options, "headers") && gen18_options.headers !== void 0 ? gen18_options.headers : {};
            gen2_callback(void 0, void 0);
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
        var gen20_items, gen21_i;
        resource = Object.create(resource);
        if (response) {
            gen20_items = [ "body", "statusCode", "headers" ];
            for (gen21_i = 0; gen21_i < gen20_items.length; ++gen21_i) {
                field = gen20_items[gen21_i];
                resource[field] = response[field];
            }
            resource.url = response.request.href;
        }
        return resource;
    };
    for (field in resource) {
        (function(field) {
            exports[field] = resource[field];
        })(field);
    }
    exports.resource = function(url) {
        var self = this;
        resource = createResource();
        resource.url = url;
        return resource;
    };
})).call(this);