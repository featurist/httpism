(function() {
    var Promise = require("bluebird");
    var self = this;
    var http, urlUtils, _, coerceArray, mergeInto, parseClientArguments, client, streamToString, jsonResponse, stringRequest, stringResponse, jsonRequest, exceptionResponse, nodeSend, logger;
    http = require("http");
    urlUtils = require("url");
    _ = require("underscore");
    coerceArray = function(i) {
        if (i instanceof Array) {
            return i;
        } else {
            return [ i ];
        }
    };
    mergeInto = function(x, y) {
        var r, gen1_items, gen2_i, ykey, gen3_items, gen4_i, xkey;
        if (x instanceof Object) {
            r = {};
            gen1_items = Object.keys(y);
            for (gen2_i = 0; gen2_i < gen1_items.length; ++gen2_i) {
                ykey = gen1_items[gen2_i];
                r[ykey] = y[ykey];
            }
            gen3_items = Object.keys(x);
            for (gen4_i = 0; gen4_i < gen3_items.length; ++gen4_i) {
                xkey = gen3_items[gen4_i];
                r[xkey] = x[xkey];
            }
            return r;
        } else {
            return y;
        }
    };
    parseClientArguments = function(middlewares, options) {
        if (middlewares instanceof Array || middlewares instanceof Function) {
            return {
                middlewares: coerceArray(middlewares),
                options: options || {}
            };
        } else if (middlewares instanceof Object) {
            return {
                middlewares: [],
                options: middlewares
            };
        } else {
            return {
                middlewares: [],
                options: {}
            };
        }
    };
    client = function(middlewares, clientOptions) {
        var args, send, resource;
        args = parseClientArguments(middlewares, clientOptions);
        middlewares = args.middlewares;
        clientOptions = args.options;
        send = function() {
            var sendToMiddleware;
            sendToMiddleware = function(middlewares, index) {
                var middleware;
                middleware = middlewares[index];
                if (middleware) {
                    return function(request) {
                        return middleware(request, sendToMiddleware(middlewares, index + 1));
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
                } else {
                    return url;
                }
            };
            sendRequest = function(method, url, body, options) {
                var gen5_asyncResult, response;
                return new Promise(function(gen6_onFulfilled) {
                    options = mergeInto(options, clientOptions);
                    gen6_onFulfilled(Promise.resolve(send({
                        method: method,
                        url: resolveUrl(url),
                        body: body,
                        headers: {},
                        options: options
                    })).then(function(gen5_asyncResult) {
                        response = gen5_asyncResult;
                        return resource(response);
                    }));
                });
            };
            res = {
                client: function(newMiddlewares, options) {
                    var self = this;
                    var args;
                    args = parseClientArguments(newMiddlewares, options);
                    return client(coerceArray(args.middlewares).concat(middlewares), mergeInto(args.options, clientOptions));
                },
                resource: function(url) {
                    var self = this;
                    return resource({
                        url: resolveUrl(url)
                    });
                }
            };
            sends = function(method) {
                return res[method] = function(url, options) {
                    var self = this;
                    var gen7_asyncResult;
                    return new Promise(function(gen6_onFulfilled) {
                        gen6_onFulfilled(Promise.resolve(sendRequest(method.toUpperCase(), url, void 0, options)));
                    });
                };
            };
            sendsWithBody = function(method) {
                return res[method] = function(url, body, options) {
                    var self = this;
                    var gen8_asyncResult;
                    return new Promise(function(gen6_onFulfilled) {
                        gen6_onFulfilled(Promise.resolve(sendRequest(method.toUpperCase(), url, body, options)));
                    });
                };
            };
            sends("get");
            sendsWithBody("post");
            sendsWithBody("put");
            return _.extend(res, response);
        };
        return resource({}, {});
    };
    streamToString = function(s) {
        return new Promise(function(result, error) {
            var string;
            s.setEncoding("utf-8");
            string = "";
            s.on("data", function(d) {
                return string = string + d;
            });
            s.on("end", function() {
                return result(string);
            });
            return s.on("error", function(e) {
                return error(e);
            });
        });
    };
    jsonResponse = function(request, next) {
        var gen9_asyncResult, response;
        return new Promise(function(gen6_onFulfilled) {
            gen6_onFulfilled(Promise.resolve(next(request)).then(function(gen9_asyncResult) {
                response = gen9_asyncResult;
                if (/^\s*application\/json\s*($|;)/.test(response.headers["content-type"])) {
                    response.body = JSON.parse(response.body);
                    return response;
                } else {
                    return response;
                }
            }));
        });
    };
    stringRequest = function(request, next) {
        var body, gen10_asyncResult;
        return new Promise(function(gen6_onFulfilled) {
            if (request.body) {
                body = request.body;
                request.body = {
                    pipe: function(stream) {
                        var self = this;
                        stream.write(body);
                        return stream.end();
                    }
                };
            }
            gen6_onFulfilled(Promise.resolve(next(request)));
        });
    };
    stringResponse = function(request, next) {
        var gen11_asyncResult, response, gen12_asyncResult;
        return new Promise(function(gen6_onFulfilled) {
            gen6_onFulfilled(Promise.resolve(next(request)).then(function(gen11_asyncResult) {
                response = gen11_asyncResult;
                return Promise.resolve(streamToString(response.body)).then(function(gen12_asyncResult) {
                    response.body = gen12_asyncResult;
                    return response;
                });
            }));
        });
    };
    jsonRequest = function(request, next) {
        var gen13_asyncResult;
        return new Promise(function(gen6_onFulfilled) {
            if (request.body) {
                request.body = JSON.stringify(request.body);
                request.headers["content-type"] = "application/json";
            }
            gen6_onFulfilled(Promise.resolve(next(request)));
        });
    };
    exceptionResponse = function(request, next) {
        var gen14_asyncResult, response, error;
        return new Promise(function(gen6_onFulfilled) {
            gen6_onFulfilled(Promise.resolve(next(request)).then(function(gen14_asyncResult) {
                response = gen14_asyncResult;
                if (response.statusCode >= 400 && request.options.exceptions !== false) {
                    error = _.extend(new Error(request.method + " " + request.url + " => " + response.statusCode + " " + http.STATUS_CODES[response.statusCode]), response);
                    throw error;
                } else {
                    return response;
                }
            }));
        });
    };
    nodeSend = function(request) {
        return new Promise(function(result, error) {
            var url, req;
            url = urlUtils.parse(request.url);
            req = http.request({
                hostname: url.hostname,
                port: url.port,
                method: request.method,
                path: url.path,
                headers: request.headers
            }, function(res) {
                return result({
                    statusCode: res.statusCode,
                    url: request.url,
                    headers: res.headers,
                    body: res
                });
            });
            req.on("error", function(e) {
                return error(e);
            });
            if (request.body) {
                return request.body.pipe(req);
            } else {
                return req.end();
            }
        });
    };
    logger = function(request, next) {
        var gen15_asyncResult, response;
        return new Promise(function(gen6_onFulfilled) {
            if (request.options.log) {
                console.log(request);
            }
            gen6_onFulfilled(Promise.resolve(next(request)).then(function(gen15_asyncResult) {
                response = gen15_asyncResult;
                if (request.options.log) {
                    console.log(response);
                }
                return response;
            }));
        });
    };
    exports.json = client([ exceptionResponse, jsonRequest, jsonResponse, stringRequest, stringResponse, logger, nodeSend ]);
}).call(this);