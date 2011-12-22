var matador = require('matador')
app.configure(function () {
  app.set('models', __dirname + '/models')
  app.set('helpers', __dirname + '/helpers')
  app.set('views', __dirname + '/views')
  app.set('controllers', __dirname + '/controllers')

  app.use(matador.cookieParser())
  app.use(matador.bodyParser())
  app.use(matador.methodOverride())
  app.use(matador.static(__dirname + '/public'))
})

app.configure('development', function () {
  app.use(matador.errorHandler({ dumpExceptions: true, showStack: true }))
})

app.configure('production', function () {
  app.use(matador.errorHandler())
})
matador.mount(require('./config/routes'))
app.listen(3000)
console.log('matador running on port 3000')