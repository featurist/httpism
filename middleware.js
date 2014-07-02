(function() {
    var Promise = require("bluebird");
    var self = this;
    var http, https, urlUtils, _, mergeInto, qs, isAStream, nodeRequest, setHeaderTo;
    http = require("http");
    https = require("https");
    urlUtils = require("url");
    _ = require("underscore");
    mergeInto = require("./mergeInto");
    qs = require("qs");
    exports.streamToString = function(s) {
        var self = this;
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
    exports.consumeStream = function(s) {
        var self = this;
        return new Promise(function(gen1_onFulfilled) {
            gen1_onFulfilled(new Promise(function(result, error) {
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
    exports.contentTypeIs = function(response, expectedContentType) {
        var self = this;
        var re;
        re = new RegExp("^\\s*" + expectedContentType + "\\s*($|;)");
        return re.test(response.headers["content-type"]);
    };
    exports.contentTypeIsText = function(response) {
        var self = this;
        return exports.contentTypeIs(response, "text/.*");
    };
    isAStream = function(body) {
        return body !== void 0 && body.pipe instanceof Function;
    };
    exports.json = function(request, next) {
        var self = this;
        var gen2_asyncResult, response, gen3_asyncResult;
        return new Promise(function(gen1_onFulfilled) {
            if (request.body instanceof Object && !isAStream(request.body)) {
                request.body = exports.stringToStream(JSON.stringify(request.body));
                setHeaderTo(request, "content-type", "application/json");
            }
            setHeaderTo(request, "accept", "application/json");
            gen1_onFulfilled(Promise.resolve(next()).then(function(gen2_asyncResult) {
                response = gen2_asyncResult;
                return Promise.resolve(function() {
                    if (exports.contentTypeIs(response, "application/json")) {
                        return new Promise(function(gen1_onFulfilled) {
                            gen1_onFulfilled(Promise.resolve(exports.streamToString(response.body)).then(function(gen4_asyncResult) {
                                response.body = JSON.parse(gen4_asyncResult);
                                return response;
                            }));
                        });
                    } else {
                        return response;
                    }
                }());
            }));
        });
    };
    exports.stringToStream = function(s) {
        var self = this;
        return {
            pipe: function(stream) {
                var self = this;
                stream.write(s);
                return stream.end();
            }
        };
    };
    exports.exception = function(request, next) {
        var self = this;
        var gen5_asyncResult, response, error;
        return new Promise(function(gen1_onFulfilled) {
            gen1_onFulfilled(Promise.resolve(next()).then(function(gen5_asyncResult) {
                response = gen5_asyncResult;
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
    exports.nodeSend = function(request) {
        var self = this;
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
    exports.logger = function(request, next) {
        var self = this;
        var log, gen6_asyncResult, response;
        return new Promise(function(gen1_onFulfilled) {
            log = request.options.log;
            if (log === true || log === "request") {
                console.log(request);
            }
            gen1_onFulfilled(Promise.resolve(next()).then(function(gen6_asyncResult) {
                response = gen6_asyncResult;
                if (log === true || log === "response") {
                    console.log(response);
                }
                return response;
            }));
        });
    };
    exports.redirect = function(request, next, api) {
        var self = this;
        var gen7_asyncResult, response, statusCode, location, gen8_asyncResult;
        return new Promise(function(gen1_onFulfilled) {
            gen1_onFulfilled(Promise.resolve(next()).then(function(gen7_asyncResult) {
                response = gen7_asyncResult;
                statusCode = response.statusCode;
                location = response.headers.location;
                return Promise.resolve(function() {
                    if (request.options.redirect !== false && location && (statusCode === 300 || statusCode === 301 || statusCode === 302 || statusCode === 303 || statusCode === 307)) {
                        return new Promise(function(gen1_onFulfilled) {
                            gen1_onFulfilled(Promise.resolve(exports.consumeStream(response.body)).then(function(gen9_asyncResult) {
                                gen9_asyncResult;
                                return Promise.resolve(api.get(urlUtils.resolve(request.url, location), request.options)).then(function(gen10_asyncResult) {
                                    redirectResponse = gen10_asyncResult;
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
    exports.headers = function(request, next) {
        var self = this;
        var gen11_asyncResult;
        return new Promise(function(gen1_onFulfilled) {
            if (request.options.headers) {
                request.headers = mergeInto(request.options.headers, request.headers);
            }
            gen1_onFulfilled(Promise.resolve(next()));
        });
    };
    exports.text = function(request, next) {
        var self = this;
        var gen12_asyncResult, response, gen13_asyncResult;
        return new Promise(function(gen1_onFulfilled) {
            if (typeof request.body === "string") {
                request.body = exports.stringToStream(request.body);
                setHeaderTo(request, "content-type", "text/plain");
            }
            gen1_onFulfilled(Promise.resolve(next()).then(function(gen12_asyncResult) {
                response = gen12_asyncResult;
                return Promise.resolve(function() {
                    if (exports.contentTypeIsText(response) || exports.contentTypeIs(response, "application/javascript")) {
                        return new Promise(function(gen1_onFulfilled) {
                            gen1_onFulfilled(Promise.resolve(exports.streamToString(response.body)).then(function(gen14_asyncResult) {
                                response.body = gen14_asyncResult;
                                return response;
                            }));
                        });
                    } else {
                        return response;
                    }
                }());
            }));
        });
    };
    setHeaderTo = function(request, header, value) {
        if (!request.headers[header]) {
            return request.headers[header] = value;
        }
    };
    exports.form = function(request, next) {
        var self = this;
        var gen15_asyncResult, response, gen16_asyncResult;
        return new Promise(function(gen1_onFulfilled) {
            if (request.options.form && request.body instanceof Object && !isAStream(request.body)) {
                request.body = exports.stringToStream(qs.stringify(request.body));
                setHeaderTo(request, "content-type", "application/x-www-form-urlencoded");
            }
            gen1_onFulfilled(Promise.resolve(next()).then(function(gen15_asyncResult) {
                response = gen15_asyncResult;
                return Promise.resolve(function() {
                    if (exports.contentTypeIs(response, "application/x-www-form-urlencoded")) {
                        return new Promise(function(gen1_onFulfilled) {
                            gen1_onFulfilled(Promise.resolve(exports.streamToString(response.body)).then(function(gen17_asyncResult) {
                                return response.body = qs.parse(gen17_asyncResult);
                            }));
                        });
                    }
                }()).then(function(gen16_asyncResult) {
                    gen16_asyncResult;
                    return response;
                });
            }));
        });
    };
}).call(this);