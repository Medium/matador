var matador = require('matador')
  , env = process.env.NODE_ENV || 'development'
  , argv = matador.argv
  , config = require('./app/config/' + env)
  , app = matador.createApp(__dirname, config, {})
  , port = argv.port || process.env.PORT || 3000

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

app.boot(port)
console.log('matador running on port ' + port)
