var express = module.exports = require('express')
  , hogan = require('hogan.js')
  // not all globals are bad
  , app = global.app = express.createServer()
  , Class = global.Class = require('klass')
  , v = global.v = require('valentine')
  , modelCache = {}
app.configure(function () {
  app.set('modelCache', modelCache)
})


module.exports.mount = require('./router').init
module.exports.engine = {
  compile: function(source, options) {
    if (typeof source != 'string') return source
    return function (options) {
      options.locals = options.locals || {}
      options.partials = options.partials || {}
      if (options.body) options.locals.body = options.body
      for (var i in options.partials) {
        if (v.is.fun(options.partials[i].r)) continue
        options.partials[i] = hogan.compile(options.partials[i])
      }
      return hogan.compile(source, options).render(options.locals, options.partials)
    }
  }
}
module.exports.BaseController = require('./BaseController')
module.exports.partials = require('./partialRenderer')