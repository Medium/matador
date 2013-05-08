var matador = require('matador')
  , env = process.env.NODE_ENV || 'development'
  , argv = matador.argv
  , config = require('./app/config/' + env)
  , app = matador.createApp(__dirname, config, {})
  , port = argv.port || process.env.PORT || 3000

// Register the matador cache helper.
app.registerHelper('Cache', matador.helpers.CacheHelper)

app.configure(function () {

  app.set('view engine', 'html')
  app.register('.html', matador.engine)

  // Use the cache helper's no-cache middleware.
  app.use(app.getHelper('Cache').auditHeadersMiddleware)
  app.use(app.getHelper('Cache').noCacheMiddleware)

  app.use(matador.cookieParser())
  app.use(matador.session({secret: 'boosh'}))

  // TODO: Add JSON body parser middleware
  app.use(app.requestDecorator())
  app.use(app.preRouter())

  app.use(matador.bodyParser())
})

app.configure('development', function () {
  app.use(matador.errorHandler({ dumpExceptions: true, showStack: true }))
  app.set('soy options', {
    eraseTemporaryFiles: true
    , allowDynamicRecompile: true
  })
})

app.configure('production', function () {
  app.use(matador.errorHandler())
})

app.configure(function () {
  app.use(app.router({}))
})

app.prefetch()
app.mount()
app.listen(port)
console.log('matador running on port ' + port)
