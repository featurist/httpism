/* eslint-env mocha */

var deepExtend = require('../deepExtend')
var expect = require('chai').expect

describe('deepExtend', function () {
  it('can deepExtend values', function () {
    var left = {
      common: 'left',
      keep: 'left',
      override: 'left'
    }
    var right = {
      common: 'right',
      override: 'right'
    }

    deepExtend(left, right)

    expect(left).to.eql({
      common: 'right',
      keep: 'left',
      override: 'right'
    })

    expect(right).to.eql({
      common: 'right',
      override: 'right'
    })
  })

  it('can deepExtend nested objects', function () {
    var left = {
      nested: {
        common: 'left',
        keep: 'left',
        override: 'left'
      }
    }

    var right = {
      nested: {
        common: 'right',
        override: 'right'
      }
    }

    deepExtend(left, right)

    expect(left).to.eql({
      nested: {
        common: 'right',
        keep: 'left',
        override: 'right'
      }
    })

    expect(right).to.eql({
      nested: {
        common: 'right',
        override: 'right'
      }
    })
  })

  it('copied fields are cloned', function () {
    var left = {
    }

    var right = {
      nested: {
        common: 'right',
        override: 'right'
      }
    }

    deepExtend(left, right)

    expect(left).to.eql({
      nested: {
        common: 'right',
        override: 'right'
      }
    })

    left.nested.common = 'modified'

    expect(right).to.eql({
      nested: {
        common: 'right',
        override: 'right'
      }
    })
  })
})
