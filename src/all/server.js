var matador = require('matador')
  , config = require('./app/config/' + matador.getEnv())
  , app = matador.createApp(__dirname, config, {})
  , port = process.env.PORT || 3000

app.useDevErrorHandler()
app.useCommonMiddleware()
app.start()
app.listen(port)

console.log('matador running on port ' + port)
