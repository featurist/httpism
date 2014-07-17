(function() {
    var Promise = require("bluebird");
    var self = this;
    var http, https, urlUtils, _, mergeInto, qs, contentTypeIs, contentTypeIsText, isAStream, shouldParseAs, responseBodyTypes, setBodyToString, stringToStream, nodeRequest, logResponseDependingOnOptions, setHeaderTo;
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
    exports.contentTypeIs = contentTypeIs = function(response, expectedContentType) {
        var re;
        re = new RegExp("^\\s*" + expectedContentType + "\\s*($|;)");
        return re.test(response.headers["content-type"]);
    };
    exports.contentTypeIsText = contentTypeIsText = function(response) {
        return exports.contentTypeIs(response, "text/.*");
    };
    isAStream = function(body) {
        return body !== void 0 && body.pipe instanceof Function;
    };
    shouldParseAs = function(response, type, gen2_options) {
        var contentType, request;
        contentType = gen2_options !== void 0 && Object.prototype.hasOwnProperty.call(gen2_options, "contentType") && gen2_options.contentType !== void 0 ? gen2_options.contentType : void 0;
        request = gen2_options !== void 0 && Object.prototype.hasOwnProperty.call(gen2_options, "request") && gen2_options.request !== void 0 ? gen2_options.request : void 0;
        var bodyType;
        if (request.options.responseBody) {
            return type === request.options.responseBody;
        } else {
            bodyType = responseBodyTypes[type];
            if (bodyType) {
                return bodyType(response);
            }
        }
    };
    responseBodyTypes = {
        json: function(response) {
            var self = this;
            return contentTypeIs(response, "application/json");
        },
        text: function(response) {
            var self = this;
            return contentTypeIsText(response) || contentTypeIs(response, "application/javascript");
        },
        form: function(response) {
            var self = this;
            return contentTypeIs(response, "application/x-www-form-urlencoded");
        },
        stream: function(response) {
            var self = this;
            return false;
        }
    };
    exports.json = function(request, next) {
        var self = this;
        var gen3_asyncResult, response, gen4_asyncResult;
        return new Promise(function(gen1_onFulfilled) {
            if (request.body instanceof Object && !isAStream(request.body)) {
                setBodyToString(request, JSON.stringify(request.body));
                setHeaderTo(request, "content-type", "application/json");
            }
            setHeaderTo(request, "accept", "application/json");
            gen1_onFulfilled(Promise.resolve(next()).then(function(gen3_asyncResult) {
                response = gen3_asyncResult;
                return Promise.resolve(function() {
                    if (shouldParseAs(response, "json", {
                        request: request
                    })) {
                        return new Promise(function(gen1_onFulfilled) {
                            gen1_onFulfilled(Promise.resolve(exports.streamToString(response.body)).then(function(gen5_asyncResult) {
                                response.body = JSON.parse(gen5_asyncResult);
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
    setBodyToString = function(r, s) {
        r.body = stringToStream(s);
        r.headers["content-length"] = Buffer.byteLength(s, "utf-8");
        if (r.options.log) {
            return r.stringBody = s;
        }
    };
    exports.stringToStream = stringToStream = function(s) {
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
        var gen6_asyncResult, response, error;
        return new Promise(function(gen1_onFulfilled) {
            gen1_onFulfilled(Promise.resolve(next()).then(function(gen6_asyncResult) {
                response = gen6_asyncResult;
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
    exports.logRequest = function(request, next) {
        var self = this;
        var log, gen7_asyncResult;
        return new Promise(function(gen1_onFulfilled) {
            log = request.options.log;
            if (log === true || log === "request") {
                console.log(request);
            }
            gen1_onFulfilled(Promise.resolve(next()));
        });
    };
    exports.logResponse = function(request, next) {
        var self = this;
        var gen8_asyncResult, response;
        return new Promise(function(gen1_onFulfilled) {
            gen1_onFulfilled(Promise.resolve(next()).then(function(gen8_asyncResult) {
                response = gen8_asyncResult;
                logResponseDependingOnOptions(response, request.options);
                return response;
            }));
        });
    };
    logResponseDependingOnOptions = function(response, options) {
        var log;
        log = options.log;
        if (log === true || log === "response") {
            return console.log(response);
        }
    };
    exports.redirect = function(request, next, api) {
        var self = this;
        var gen9_asyncResult, response, statusCode, location, gen10_asyncResult;
        return new Promise(function(gen1_onFulfilled) {
            gen1_onFulfilled(Promise.resolve(next()).then(function(gen9_asyncResult) {
                response = gen9_asyncResult;
                statusCode = response.statusCode;
                location = response.headers.location;
                return Promise.resolve(function() {
                    if (request.options.redirect !== false && location && (statusCode === 300 || statusCode === 301 || statusCode === 302 || statusCode === 303 || statusCode === 307)) {
                        return new Promise(function(gen1_onFulfilled) {
                            gen1_onFulfilled(Promise.resolve(exports.consumeStream(response.body)).then(function(gen11_asyncResult) {
                                gen11_asyncResult;
                                logResponseDependingOnOptions(response, request.options);
                                return Promise.resolve(api.get(urlUtils.resolve(request.url, location), request.options)).then(function(gen12_asyncResult) {
                                    redirectResponse = gen12_asyncResult;
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
        var gen13_asyncResult;
        return new Promise(function(gen1_onFulfilled) {
            if (request.options.headers) {
                request.headers = mergeInto(request.options.headers, request.headers);
            }
            gen1_onFulfilled(Promise.resolve(next()));
        });
    };
    exports.text = function(request, next) {
        var self = this;
        var gen14_asyncResult, response, gen15_asyncResult;
        return new Promise(function(gen1_onFulfilled) {
            if (typeof request.body === "string") {
                setBodyToString(request, request.body);
                setHeaderTo(request, "content-type", "text/plain");
            }
            gen1_onFulfilled(Promise.resolve(next()).then(function(gen14_asyncResult) {
                response = gen14_asyncResult;
                return Promise.resolve(function() {
                    if (shouldParseAs(response, "text", {
                        request: request
                    })) {
                        return new Promise(function(gen1_onFulfilled) {
                            gen1_onFulfilled(Promise.resolve(exports.streamToString(response.body)).then(function(gen16_asyncResult) {
                                response.body = gen16_asyncResult;
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
        var gen17_asyncResult, response, gen18_asyncResult;
        return new Promise(function(gen1_onFulfilled) {
            if (request.options.form && request.body instanceof Object && !isAStream(request.body)) {
                setBodyToString(request, qs.stringify(request.body));
                setHeaderTo(request, "content-type", "application/x-www-form-urlencoded");
            }
            gen1_onFulfilled(Promise.resolve(next()).then(function(gen17_asyncResult) {
                response = gen17_asyncResult;
                return Promise.resolve(function() {
                    if (shouldParseAs(response, "form", {
                        request: request
                    })) {
                        return new Promise(function(gen1_onFulfilled) {
                            gen1_onFulfilled(Promise.resolve(exports.streamToString(response.body)).then(function(gen19_asyncResult) {
                                return response.body = qs.parse(gen19_asyncResult);
                            }));
                        });
                    }
                }()).then(function(gen18_asyncResult) {
                    gen18_asyncResult;
                    return response;
                });
            }));
        });
    };
    exports.querystring = function(request, next) {
        var self = this;
        var split, path, querystring, mergedQueryString, gen20_asyncResult;
        return new Promise(function(gen1_onFulfilled) {
            if (request.options.querystring instanceof Object) {
                split = request.url.split("?");
                path = split[0];
                querystring = qs.parse(split[1]);
                mergedQueryString = mergeInto(request.options.querystring, querystring);
                request.url = path + "?" + qs.stringify(mergedQueryString);
            }
            gen1_onFulfilled(Promise.resolve(next()));
        });
    };
    exports.basicAuth = function(request, next) {
        var self = this;
        var encodeUsernameAndPassword, gen21_asyncResult;
        return new Promise(function(gen1_onFulfilled) {
            if (request.options.basicAuth) {
                encodeUsernameAndPassword = function() {
                    return new Buffer(request.options.basicAuth.username.replace(/:/g, "") + ":" + request.options.basicAuth.password).toString("base64");
                };
                request.headers.authorization = "Basic " + encodeUsernameAndPassword();
            }
            gen1_onFulfilled(Promise.resolve(next()));
        });
    };
}).call(this);