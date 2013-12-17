create vcr (request, recorder) =

    record request (options, cb) =
        request (options) @(err, response, body)
            recorder.store (options, err, response, body)
                cb(err, response, body) 

    respond (options, cb) =
        recorder.retrieve (options) @(cached)
            if (cached)
                cb.apply(recorder, cached)
            else
                record request (options, cb)

memory recorder () = {
                
    tapes = {}

    key for (options) =
        options.method + ' ' + options.url

    store (options, err, response, body, callback) =
        key = self.key for (options)
        self.tapes.(key) = [err, response, body]
        callback()

    retrieve (options, callback) =
        key = self.key for (options)
        callback(self.tapes.(key))

}

exports.vcr (request) =
    create vcr (request, memory recorder ())