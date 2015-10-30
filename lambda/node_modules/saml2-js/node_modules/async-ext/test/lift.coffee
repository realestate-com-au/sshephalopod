assert = require 'assert'
sinon = require 'sinon'
_ = require 'underscore'
async = _.extend require('async'), require('../async-ext')

describe 'async.lift', ->

  require('./async_wrapper') async.lift

  it 'applies the callback to the result value of the original function', (done) ->
    expected = 1
    fn = sinon.stub().returns expected
    lifted = async.lift fn
    lifted (err, results...) ->
      assert.ifError err
      assert.deepEqual results, [expected]
      done()

  it 'applies the callback to the result array of the original function', (done) ->
    expected = [new Error(), 1, 2, '3']
    fn = sinon.stub().returns expected
    lifted = async.lift fn
    lifted (err, results...) ->
      assert.ifError err
      assert.deepEqual results, expected
      done()

  it 'applies the callback with no results if the original function returns undefined', (done) ->
    fn = sinon.stub().returns undefined
    lifted = async.lift fn
    lifted (err, results...) ->
      assert.ifError err
      assert.deepEqual results, []
      done()
