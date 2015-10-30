assert = require 'assert'
sinon = require 'sinon'
_ = require 'underscore'
async = _.extend require('async'), require('../async-ext')

describe 'async.mapValues', ->

  it 'calls the cb with empty results given an empty object', (done) ->
    async.mapValues {}, (->), (err, res) ->
      assert.ifError err
      assert.deepEqual res, {}
      done()

  it 'applies the function to each key/val pair and passes the result to the callback', (done) ->
    async.mapValues { a: 1, b: 2 }, (val, key, cb_mv) ->
      cb_mv null, val + key
    , (err, res) ->
      assert.ifError err
      assert.deepEqual res, { a: '1a', b: '2b' }
      done()

  it 'short circuits with an error, passing it to the callback', (done) ->
    expected_err = new Error 'oops'
    fn = sinon.stub().yields expected_err
    async.mapValues { a: 1, b: 2 }, fn, (err, res) ->
      assert.equal err, expected_err
      assert not res?, 'Expected undefined result'
      assert fn.calledOnce, 'Expected fn to be called exactly once'
      done()
