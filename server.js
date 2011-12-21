var matador = require('matador')
app.configure(function () {
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

matador.listen(3000)