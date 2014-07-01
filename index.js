(function() {
    var Promise = require("bluebird");
    var self = this;
    var urlUtils, _, middleware, mergeInto, client, toArray, parseClientArguments;
    urlUtils = require("url");
    _ = require("underscore");
    middleware = require("./middleware");
    mergeInto = require("./mergeInto");
    client = function(clientUrl, clientOptions, middlewares) {
        var send, resource;
        send = function() {
            var sendToMiddleware;
            sendToMiddleware = function(middlewares, index) {
                var middleware;
                middleware = middlewares[index];
                if (middleware) {
                    return function(request, api) {
                        return middleware(request, function() {
                            return sendToMiddleware(middlewares, index + 1)(request, api);
                        }, api);
                    };
                } else {
                    return void 0;
                }
            };
            return sendToMiddleware(middlewares, 0);
        }();
        resource = function(response) {
            var resolveUrl, sendRequest, res, sends, sendsWithBody;
            resolveUrl = function(url) {
                if (response.url) {
                    return urlUtils.resolve(response.url, url);
                } else if (clientUrl) {
                    return urlUtils.resolve(clientUrl, url);
                } else {
                    return url;
                }
            };
            sendRequest = function(method, url, body, options, api) {
                var gen1_asyncResult, response;
                return new Promise(function(gen2_onFulfilled) {
                    options = mergeInto(options, clientOptions);
                    gen2_onFulfilled(Promise.resolve(function() {
                        var gen3_asyncResult;
                        return new Promise(function(gen2_onFulfilled) {
                            gen2_onFulfilled(new Promise(function(gen2_onFulfilled) {
                                gen2_onFulfilled(Promise.resolve(send({
                                    method: method,
                                    url: resolveUrl(url),
                                    body: body,
                                    headers: {},
                                    options: options
                                }, api)));
                            }).then(void 0, function(e) {
                                if (e.redirectResponse) {
                                    return e.redirectResponse;
                                } else {
                                    throw e;
                                }
                            }));
                        });
                    }()).then(function(gen1_asyncResult) {
                        response = gen1_asyncResult;
                        return resource(response);
                    }));
                });
            };
            res = {
                api: function(url, options, newMiddlewares) {
                    var self = this;
                    var args;
                    args = parseClientArguments(url, options, newMiddlewares);
                    return client(resolveUrl(args.url), mergeInto(args.options, clientOptions), toArray(args.middlewares).concat(middlewares));
                }
            };
            sends = function(method) {
                return res[method] = function(url, options) {
                    var self = this;
                    var gen4_asyncResult;
                    return new Promise(function(gen2_onFulfilled) {
                        gen2_onFulfilled(Promise.resolve(sendRequest(method.toUpperCase(), url, void 0, options, self)));
                    });
                };
            };
            sendsWithBody = function(method) {
                return res[method] = function(url, body, options) {
                    var self = this;
                    var gen5_asyncResult;
                    return new Promise(function(gen2_onFulfilled) {
                        gen2_onFulfilled(Promise.resolve(sendRequest(method.toUpperCase(), url, body, options, self)));
                    });
                };
            };
            sends("get");
            sends("delete");
            sends("head");
            sendsWithBody("post");
            sendsWithBody("put");
            sendsWithBody("patch");
            sendsWithBody("options");
            return _.extend(res, response);
        };
        return resource({});
    };
    toArray = function(i) {
        if (i instanceof Array) {
            return i;
        } else if (i !== void 0) {
            return [ i ];
        } else {
            return [];
        }
    };
    parseClientArguments = function() {
        var args = Array.prototype.slice.call(arguments, 0, arguments.length);
        var url, middlewares, options;
        url = function() {
            var gen6_results, gen7_items, gen8_i, arg;
            gen6_results = [];
            gen7_items = args;
            for (gen8_i = 0; gen8_i < gen7_items.length; ++gen8_i) {
                arg = gen7_items[gen8_i];
                (function(arg) {
                    if (typeof arg === "string") {
                        return gen6_results.push(arg);
                    }
                })(arg);
            }
            return gen6_results;
        }()[0];
        middlewares = toArray(function() {
            var gen9_results, gen10_items, gen11_i, arg;
            gen9_results = [];
            gen10_items = args;
            for (gen11_i = 0; gen11_i < gen10_items.length; ++gen11_i) {
                arg = gen10_items[gen11_i];
                (function(arg) {
                    if (arg instanceof Array || arg instanceof Function) {
                        return gen9_results.push(arg);
                    }
                })(arg);
            }
            return gen9_results;
        }()[0]);
        options = function() {
            var gen12_results, gen13_items, gen14_i, arg;
            gen12_results = [];
            gen13_items = args;
            for (gen14_i = 0; gen14_i < gen13_items.length; ++gen14_i) {
                arg = gen13_items[gen14_i];
                (function(arg) {
                    if (!(arg instanceof Array) && !(arg instanceof Function) && arg instanceof Object) {
                        return gen12_results.push(arg);
                    }
                })(arg);
            }
            return gen12_results;
        }()[0] || {};
        return {
            middlewares: middlewares,
            options: options,
            url: url
        };
    };
    module.exports = client(void 0, {}, [ middleware.headers, middleware.exception, middleware.logger, middleware.text, middleware.form, middleware.json, middleware.redirect, middleware.nodeSend ]);
    module.exports.raw = client(void 0, {}, [ middleware.nodeSend ]);
}).call(this);