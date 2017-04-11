/* eslint-env mocha */

var qs = require('../querystring-lite')
var chai = require('chai')
var expect = chai.expect

describe('querystring', function () {
  describe('.stringify({})', function () {
    it('ignores undefined values', function () {
      var stringified = qs.stringify({ foo: 123, bar: undefined })
      expect(stringified).to.equal('foo=123')
    })
  })
})
