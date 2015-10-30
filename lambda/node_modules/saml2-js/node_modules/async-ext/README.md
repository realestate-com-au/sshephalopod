# async-ext

This module consists of a set of functions to extend the capabilities of the Node.js [async](https://github.com/caolan/async) library.

## Installation

    npm install async
    npm install async-ext

## Usage

The easiest way to use async-ext is to extend the async object with the new functions. Here's how you might do it with Underscore:

```coffeescript
_ = require 'underscore'
async = _.extend require('async'), require('async-ext')
```

## Functions

### async.lift(fun)

"Lifts" a regular old synchronous function into the wondrous world of async.

Why would you ever want to make *more* functions async then you have to? Well, imagine you were using `async.waterfall` to get fetch some data asynchronously, transform it synchronously, and send it off somewhere else asynchronously. Your code might look like this:

```coffeescript
async.waterfall [
    fetchData
    (data, cb) ->
        try 
            data = transform data
            sendData data, cb
        catch err
            setImmediate -> cb err
], errHandler
```

With `async.lift`, you can write that like this:

```coffeescript
async.waterfall [
    fetchData
    async.lift (data) -> transform data
    sendData
], errHandler
```

`async.lift` takes a synchronous function and returns an asynchronous version of that function that applies its callback to any results returned by the original function.

The input function may accept any number of arguments - the resulting function will as well. If the input function returns a single value, the callback will be called with that value. If the input function returns an array, the callback will be applied to the array.

Any errors thrown by the input function will be caught and passed to the callback. If no error is thrown, the callback will be called with `null` as the error argument.

The resulting function will call its callback using `setImmediate`, to prevent [releasing the Zalgo](http://blog.izs.me/post/59142742143/designing-apis-for-asynchrony).

### async.tap(fun)

Lifts a synchronous function but ignores its return value, instead passing along whatever arguments it receives. This can be useful for inserting functions into pipelines when you only care about their side effects.

For example, we can insert some logging statements into our previous waterfall without having to modify any of the preexisting code:

```coffeescript
async.waterfall [
    fetchData
    async.lift (data) -> transform data
    async.tap (data) -> console.log 'got some data', data
    sendData # is called with the same data as the logging function
    async.tap -> console.log 'done sending!'
], errHandler
```

Any errors thrown by the input function will be caught and passed to the callback. If no error is thrown, the callback will be called with `null` as the error argument.

### async.once(fun)

Like `_.once`, takes an asynchronous function and returns a version of the function that will only run once. Subsequent calls to the function will call the given callback with the same results that were passed to the callback of the first invocation.

If the function is called multiple times, the callbacks will be called in the order of the invocations.

```coffeescript
init_db = async.once(db.connect)
init_db (err, conn1) ->
    console.log 'inited 1'
    init_db (err, conn2) ->
        console.log 'inited 2'
)
init_db (err, connr3) ->
    console.log 'inited 3'
# logs 1, 3, 2
# conn1 is conn2 is conn3
```

### async.mapValues(obj, fun, cb)

Takes an object, an async function, and a final callback. `async.mapValues` creates a new object whose values are the results of applying the function to each key/value pair of the original object. The resulting object is passed to the final callback.

If the function calls its callback with an error, it will short-circuit the computation and pass the error to the final callback.

```coffeescript
photo_obj = { file1: 'some-file.txt', file2: 'another-file.txt' }
async.mapValues photo_obj, fs.readFile, (err, res) ->
    console.log res # { file: <some-file data>, file2: <another-file data> }
```
