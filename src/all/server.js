var matador = require('matador')
  , config = require('./app/config/' + matador.getEnv())
  , app = matador.createApp(__dirname, config, {})
  , port = process.env.PORT || 3000

app.boot()
app.listen(port)

console.log('matador running on port ' + port)
