assert = require 'assert'
sinon = require 'sinon'
_ = require 'underscore'

# These are common tests for functions that wrap a synchronous function and
# call it asynchronously, like lift and tap.
module.exports = (wrapper) ->

  it 'calls the original function asynchronously', (done) ->
    fn = sinon.spy()
    wrapped = wrapper fn
    cb = ->
      assert fn.called
      done()
    wrapped cb
    assert (not fn.called)

  it 'calls the original function with args', (done) ->
    args = [1, 2, '3']
    fn = sinon.spy()
    wrapped = wrapper fn
    wrapped args..., ->
      assert fn.calledWithExactly args...
      done()

  it 'catches an error thrown by the original function and passes it to the callback', (done) ->
    expected = new Error 'sync error'
    fn = sinon.stub().throws expected
    wrapped = wrapper fn
    wrapped (err, results...) ->
      assert.equal err, expected
      assert _.isEmpty results
      done()
