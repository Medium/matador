var matador = require('matador')
  , env = process.env.NODE_ENV || 'development'
  , config = require('./app/config/' + env)
  , app = matador.createApp(__dirname, config, {})
  , port = process.env.PORT || 3000

app.boot(port)
console.log('matador running on port ' + port)
