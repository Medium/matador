var express = module.exports = require('express')
  // not all globals are bad
  , app = global.app = express.createServer()
  , Class = global.Class = require('klass')
  , v = global.v = require('valentine')
  , modelCache = {}
app.configure(function () {
  app.set('modelCache', modelCache)
  app.set('view engine', 'html')
  app.register(".html", require('./render'))
})

module.exports.mount = require('./router').init