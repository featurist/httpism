(function() {
    var Promise = require("bluebird");
    var self = this;
    var http, https, urlUtils, _, client, toArray, mergeInto, parseClientArguments, streamToString, consumeStream, jsonResponse, stringRequest, stringResponse, jsonRequest, exceptionResponse, nodeRequest, nodeSend, logger, redirectResponse;
    http = require("http");
    https = require("https");
    urlUtils = require("url");
    _ = require("underscore");
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
    mergeInto = function(x, y) {
        var r, gen6_items, gen7_i, ykey, gen8_items, gen9_i, xkey;
        if (x && y) {
            r = {};
            gen6_items = Object.keys(y);
            for (gen7_i = 0; gen7_i < gen6_items.length; ++gen7_i) {
                ykey = gen6_items[gen7_i];
                r[ykey] = y[ykey];
            }
            gen8_items = Object.keys(x);
            for (gen9_i = 0; gen9_i < gen8_items.length; ++gen9_i) {
                xkey = gen8_items[gen9_i];
                r[xkey] = x[xkey];
            }
            return r;
        } else if (y) {
            return y;
        } else {
            return x;
        }
    };
    parseClientArguments = function() {
        var args = Array.prototype.slice.call(arguments, 0, arguments.length);
        var url, middlewares, options;
        url = function() {
            var gen10_results, gen11_items, gen12_i, arg;
            gen10_results = [];
            gen11_items = args;
            for (gen12_i = 0; gen12_i < gen11_items.length; ++gen12_i) {
                arg = gen11_items[gen12_i];
                (function(arg) {
                    if (typeof arg === "string") {
                        return gen10_results.push(arg);
                    }
                })(arg);
            }
            return gen10_results;
        }()[0];
        middlewares = toArray(function() {
            var gen13_results, gen14_items, gen15_i, arg;
            gen13_results = [];
            gen14_items = args;
            for (gen15_i = 0; gen15_i < gen14_items.length; ++gen15_i) {
                arg = gen14_items[gen15_i];
                (function(arg) {
                    if (arg instanceof Array || arg instanceof Function) {
                        return gen13_results.push(arg);
                    }
                })(arg);
            }
            return gen13_results;
        }()[0]);
        options = function() {
            var gen16_results, gen17_items, gen18_i, arg;
            gen16_results = [];
            gen17_items = args;
            for (gen18_i = 0; gen18_i < gen17_items.length; ++gen18_i) {
                arg = gen17_items[gen18_i];
                (function(arg) {
                    if (!(arg instanceof Array) && !(arg instanceof Function) && arg instanceof Object) {
                        return gen16_results.push(arg);
                    }
                })(arg);
            }
            return gen16_results;
        }()[0] || {};
        return {
            middlewares: middlewares,
            options: options,
            url: url
        };
    };
    streamToString = function(s) {
        return new Promise(function(result, error) {
            var strings;
            s.setEncoding("utf-8");
            strings = [];
            s.on("data", function(d) {
                return strings.push(d);
            });
            s.on("end", function() {
                return result(strings.join(""));
            });
            return s.on("error", function(e) {
                return error(e);
            });
        });
    };
    consumeStream = function(s) {
        return new Promise(function(gen2_onFulfilled) {
            gen2_onFulfilled(new Promise(function(result, error) {
                s.on("end", function() {
                    return result();
                });
                s.on("error", function(e) {
                    return error(e);
                });
                return s.resume();
            }));
        });
    };
    jsonResponse = function(request, next) {
        var gen19_asyncResult, response;
        return new Promise(function(gen2_onFulfilled) {
            gen2_onFulfilled(Promise.resolve(next()).then(function(gen19_asyncResult) {
                response = gen19_asyncResult;
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
        var body, gen20_asyncResult;
        return new Promise(function(gen2_onFulfilled) {
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
            gen2_onFulfilled(Promise.resolve(next()));
        });
    };
    stringResponse = function(request, next) {
        var gen21_asyncResult, response, gen22_asyncResult;
        return new Promise(function(gen2_onFulfilled) {
            gen2_onFulfilled(Promise.resolve(next()).then(function(gen21_asyncResult) {
                response = gen21_asyncResult;
                return Promise.resolve(streamToString(response.body)).then(function(gen22_asyncResult) {
                    response.body = gen22_asyncResult;
                    return response;
                });
            }));
        });
    };
    jsonRequest = function(request, next) {
        var gen23_asyncResult;
        return new Promise(function(gen2_onFulfilled) {
            if (request.body) {
                request.body = JSON.stringify(request.body);
                request.headers["content-type"] = "application/json";
            }
            gen2_onFulfilled(Promise.resolve(next()));
        });
    };
    exceptionResponse = function(request, next) {
        var gen24_asyncResult, response, error;
        return new Promise(function(gen2_onFulfilled) {
            gen2_onFulfilled(Promise.resolve(next()).then(function(gen24_asyncResult) {
                response = gen24_asyncResult;
                if (response.statusCode >= 400 && request.options.exceptions !== false) {
                    error = _.extend(new Error(request.method + " " + request.url + " => " + response.statusCode + " " + http.STATUS_CODES[response.statusCode]), response);
                    throw error;
                } else {
                    return response;
                }
            }));
        });
    };
    nodeRequest = function(request, options, protocol, withResponse) {
        if (protocol === "https:") {
            return https.request(mergeInto(request, options.https), withResponse);
        } else {
            return http.request(mergeInto(request, options.http), withResponse);
        }
    };
    nodeSend = function(request) {
        return new Promise(function(result, error) {
            var url, req;
            url = urlUtils.parse(request.url);
            req = nodeRequest({
                hostname: url.hostname,
                port: url.port,
                method: request.method,
                path: url.path,
                headers: request.headers
            }, request.options, url.protocol, function(res) {
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
        var log, gen25_asyncResult, response;
        return new Promise(function(gen2_onFulfilled) {
            log = request.options.log;
            if (log === true || log === "request") {
                console.log(request);
            }
            gen2_onFulfilled(Promise.resolve(next()).then(function(gen25_asyncResult) {
                response = gen25_asyncResult;
                if (log === true || log === "response") {
                    console.log(response);
                }
                return response;
            }));
        });
    };
    redirectResponse = function(request, next, api) {
        var gen26_asyncResult, response, statusCode, location, gen27_asyncResult;
        return new Promise(function(gen2_onFulfilled) {
            gen2_onFulfilled(Promise.resolve(next()).then(function(gen26_asyncResult) {
                response = gen26_asyncResult;
                statusCode = response.statusCode;
                location = response.headers.location;
                return Promise.resolve(function() {
                    if (request.options.redirect !== false && location && (statusCode === 300 || statusCode === 301 || statusCode === 302 || statusCode === 303 || statusCode === 307)) {
                        return new Promise(function(gen2_onFulfilled) {
                            gen2_onFulfilled(Promise.resolve(consumeStream(response.body)).then(function(gen28_asyncResult) {
                                gen28_asyncResult;
                                return Promise.resolve(api.get(urlUtils.resolve(request.url, location), request.options)).then(function(gen29_asyncResult) {
                                    redirectResponse = gen29_asyncResult;
                                    throw {
                                        redirectResponse: redirectResponse
                                    };
                                });
                            }));
                        });
                    } else {
                        return response;
                    }
                }());
            }));
        });
    };
    exports.json = client(void 0, {}, [ exceptionResponse, jsonRequest, jsonResponse, logger, stringRequest, stringResponse, redirectResponse, nodeSend ]);
}).call(this);