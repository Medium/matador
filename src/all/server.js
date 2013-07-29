var matador = require('matador')
  , app = matador.createApp(__dirname, config, {})
  , config = require('./app/config/' + app.getEnv())
  , port = process.env.PORT || 3000

app.boot()
app.listen(port)

console.log('matador running on port ' + port)
