var express = module.exports = require('express')
  , fs = require('fs')

  // not all globals are bad
  , app = global.app = express.createServer()
  , Class = global.Class = require('klass')
  , v = global.v = require('valentine')
  , modelCache = {}
app.configure(function () {
  app.set('modelCache', modelCache)
})


module.exports.mount = require('./router').init
module.exports.engine = require('express-hogan.js')
module.exports.BaseController = require('./BaseController')