assert = require 'assert'
sinon = require 'sinon'
_ = require 'underscore'
async = _.extend require('async'), require('../async-ext')

describe 'async.tap', ->

  require('./async_wrapper') async.tap

  it 'ignores the results of the original function, passing along the args with a null error', (done) ->
    args = [1, 2, '3']
    fn = sinon.stub().returns [4, 5, '6']
    tapped = async.tap(fn)
    tapped args..., (err, results...) ->
      assert.ifError err
      assert.deepEqual results, args
      done()
