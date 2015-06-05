var matador = require('matador')
  , config = require('./app/config/' + matador.getEnv())
  , app = matador.createApp(__dirname, config, {})
  , port = process.env.PORT || 3000

app.useDevErrorHandler()
app.useCommonMiddleware()
app.start(function (err) {
  if (err) {
    console.error('matador failed to boot')
    console.error(err)
  } else {
    app.listen(port)
    console.log('matador running on port ' + port)
  }
})
