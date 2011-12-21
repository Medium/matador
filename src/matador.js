var express = module.exports = require('express')
  , app = global.app = express.createServer()
  , Class = global.Class = require('klass')
  , v = global.v = require('valentine')
  , modelCache = {}
app.configure(function () {
  app.set('modelCache', modelCache)
  app.set('models', __dirname + '/models')
  app.set('helpers', __dirname + '/helpers')
  app.set('views', __dirname + '/views')
  app.set('controllers', __dirname + '/controllers')
  app.use(app.router)
})

require('./router').init(require('./config/routes'))