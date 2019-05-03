/* eslint-env mocha */

var parseUri = require('../parseUri')
var chai = require('chai')
var expect = chai.expect

describe('parseUri', function () {
  function assertURL (url, object) {
    expect(parseUri(url)).to.eql(object)
  }

  it('can parse a URL', function () {
    assertURL('http://localhost:1234/', {
      auth: '',
      authority: '//localhost:1234',
      hash: '',
      host: 'localhost:1234',
      hostname: 'localhost',
      href: 'http://localhost:1234/',
      pathname: '/',
      port: '1234',
      protocol: 'http:',
      search: ''
    })
  })

  it('can parse a URL with path and query', function () {
    assertURL('http://localhost:1234/a/path?a=A&b=B', {
      auth: '',
      authority: '//localhost:1234',
      hash: '',
      host: 'localhost:1234',
      hostname: 'localhost',
      href: 'http://localhost:1234/a/path?a=A&b=B',
      pathname: '/a/path',
      port: '1234',
      protocol: 'http:',
      search: '?a=A&b=B'
    })
  })

  it('can parse a URL with username and password', function () {
    assertURL('http://user%20name:pass%20word@localhost:1234/a/path?a=A&b=B', {
      auth: 'user name:pass word',
      authority: '//user%20name:pass%20word@localhost:1234',
      hash: '',
      host: 'localhost:1234',
      hostname: 'localhost',
      href: 'http://user%20name:pass%20word@localhost:1234/a/path?a=A&b=B',
      pathname: '/a/path',
      port: '1234',
      protocol: 'http:',
      search: '?a=A&b=B'
    })
  })

  it('can parse a URL with @ and : in the path', function () {
    assertURL('http://localhost:1234/a/path@with:isnotauth?a=A&b=B', {
      auth: '',
      authority: '//localhost:1234',
      hash: '',
      host: 'localhost:1234',
      hostname: 'localhost',
      href: 'http://localhost:1234/a/path@with:isnotauth?a=A&b=B',
      pathname: '/a/path@with:isnotauth',
      port: '1234',
      protocol: 'http:',
      search: '?a=A&b=B'
    })
  })
})
