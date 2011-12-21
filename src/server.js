var express = require('express')
  , app = global.app = module.exports = express.createServer()
  , Class = global.Class = require('klass')
  , v = global.v = require('valentine')

app.configure(function () {
  var modelCache = {}
  app.set('modelCache', modelCache)
  app.set('models', __dirname + '/app/models')
  app.set('helpers', __dirname + '/app/helpers')
  app.set('views', __dirname + '/app/views')
  app.set('controllers', __dirname + '/app/controllers')
  app.use(express.cookieParser())
  app.use(express.bodyParser())
  app.use(express.methodOverride())
  app.use(app.router)
  app.use(express.static(__dirname + '/public'))
})

app.configure('development', function () {
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }))
})

app.configure('production', function () {
  app.use(express.errorHandler())
})

require('./router').init(require('./config/routes'))

app.listen(3000)
console.log("Server running on port %d in %s mode".green, app.address().port, app.settings.env)