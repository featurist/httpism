var express = require('express')
var bodyParser = require('body-parser')
var corsMiddleware = require('cors')
var cookieParser = require('cookie-parser')

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

module.exports = app
