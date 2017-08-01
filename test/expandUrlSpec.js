/* eslint-env mocha */

var expandUrl = require('../expandUrl')
var chai = require('chai')
var expect = chai.expect

describe('expandUrl', function () {
  it('overrides existing params', function () {
    var url = expandUrl('https://example.com/?existing=asdf', {newparam: 'fdsa'})
    expect(url).to.equal('https://example.com/?existing=asdf&newparam=fdsa')
  })

  it('replaces simple path params encoding as necessary', function () {
    var url = expandUrl('https://example.com/path/:param/file', {param: 'one/two'})
    expect(url).to.equal('https://example.com/path/one%2Ftwo/file')
  })

  it('replaces full path params', function () {
    var url = expandUrl('https://example.com/path/:param*/file', {param: 'one/two'})
    expect(url).to.equal('https://example.com/path/one/two/file')
  })

  it('maintains hash', function () {
    var url = expandUrl('https://example.com/path#hash', {})
    expect(url).to.equal('https://example.com/path#hash')
  })

  it('maintains port', function () {
    var url = expandUrl('https://example.com:1234/path', {})
    expect(url).to.equal('https://example.com:1234/path')
  })

  it('maintains password', function () {
    var url = expandUrl('https://user:pass@example.com:1234/path', {})
    expect(url).to.equal('https://user:pass@example.com:1234/path')
  })
})
