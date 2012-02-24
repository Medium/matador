var matador = require('matador')
  , env = process.env.NODE_ENV || 'development'
  , argv = matador.argv
  , config = require("./app/config/" + env)
  , app = matador.createApp(__dirname, config, {})
  , port = argv.port || 3000

app.configure(function () {

  app.set('view engine', 'html')
  app.register('.html', matador.engine)

  app.use(matador.cookieParser())
  app.use(matador.session({secret: 'boosh'}))

  app.use(matador.bodyParser())
  app.use(matador.methodOverride())
})

app.configure('development', function () {
  app.use(matador.errorHandler({ dumpExceptions: true, showStack: true }))
})

app.configure('production', function () {
  app.use(matador.errorHandler())
})

app.prefetch()
app.mount()
app.listen(port)
console.log('matador running on port ' + port)
