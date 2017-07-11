var express = require('express')
var bodyParser = require('body-parser')
var corsMiddleware = require('cors')
var cookieParser = require('cookie-parser')
var multiparty = require('multiparty')
var fs = require('fs-promise')
var middleware = require('../../middleware')
var basicAuth = require('basic-auth-connect')

var app = express()
app.use(bodyParser.json())
app.use(bodyParser.text())
app.use(bodyParser.urlencoded({extended: true}))
app.use(cookieParser())

var cors = corsMiddleware({credentials: true, origin: true})

function respond (req, res) {
  res.json({
    url: req.url,
    body: req.body,
    method: req.method,
    headers: req.headers,
    query: req.query,
    cookies: req.cookies,
    xhr: req.xhr
  })
}

app.all('/', cors, function (req, res) {
  respond(req, res)
})

app.delete('/delete', function (req, res) {
  res.status(204).send()
})

app.get('/text', function (req, res) {
  res.set('Content-Type', 'text/plain')
  res.send(req.query.text)
})

var secret = basicAuth(function (user, pass) {
  return user === 'user' && pass === 'good'
})

app.get('/private', secret, function (req, res) {
  res.send('private')
})

app.get('/cookies', cors, function (req, res) {
  Object.keys(req.query).forEach(function (key) {
    res.cookie(key, req.query[key])
  })
  respond(req, res)
})

app.use('/status/:status', function (req, res) {
  res.status(req.params.status)
  respond(req, res)
})

app.get('/redirect', function (req, res) {
  res.redirect(req.query.url)
})

app.get('/jsonp', function (req, res) {
  res.set('Content-Type', 'text/javascript')
  res.send(req.query.callback + "({blah: 'blah'})")
})

app.post('/form', function (req, res) {
  var form = new multiparty.Form()

  form.parse(req, function (err, fields, files) {
    if (err) {
      console.log(err)
      res.status(500).send({message: err.message})
    }
    var response = {}

    Object.keys(fields).forEach(function (field) {
      response[field] = fields[field][0]
    })
    Promise.all(Object.keys(files).map(function (field) {
      var file = files[field][0]
      return middleware.streamToString(fs.createReadStream(file.path)).then(function (contents) {
        response[field] = {
          contents: contents,
          headers: file.headers
        }
      })
    })).then(function () {
      res.send(response)
    })
  })
})
module.exports = app
