assert = require 'assert'
sinon = require 'sinon'
_ = require 'underscore'
async = _.extend require('async'), require('../async-ext')

describe 'async.once', ->

  it 'calls the original function', (done) ->
    fn = sinon.stub().yieldsAsync()
    onced = async.once fn
    onced ->
      assert fn.called
      done()

  it 'calls the original function only once', (done) ->
    fn = sinon.stub().yieldsAsync()
    onced = async.once fn
    onced ->
      onced ->
        assert fn.calledOnce
        done()

  it 'calls the original function with args', (done) ->
    args = [1, 2, '3']
    fn = sinon.stub().yieldsAsync()
    onced = async.once fn
    onced args..., ->
      assert fn.calledWith args...
      done()

  it 'calls the callback with the first results of the original function', (done) ->
    cnt = 0
    fn = (cb) -> setImmediate -> cnt += 1; cb cnt
    onced = async.once fn
    onced (results...) ->
      assert.deepEqual results, [1]
      onced (results...) ->
        assert.deepEqual results, [1]
        done()

  it 'calls the callbacks from each invocation in order', (done) ->
    cnt = 0
    fn = (cb) -> setImmediate -> cnt += 1; cb()
    onced = async.once fn
    onced ->
      assert.equal cnt, 1
      cnt += 1
    onced ->
      assert.equal cnt, 2
      cnt += 1
    onced ->
      assert.equal cnt, 3
      done()

  it 'calls the callbacks from nested invocations in order', (done) ->
    cnt = 0
    fn = (cb) -> setImmediate -> cnt += 1; cb()
    onced = async.once fn
    onced ->
      assert.equal cnt, 1
      cnt += 1
      onced ->
        assert.equal cnt, 3
        done()
    onced ->
      assert.equal cnt, 2
      cnt += 1
