// Copyright The Obvious Corporation 2013


var matador = require('../../src/matador')

exports.testDefaultEnvIsDevelopment = function (test) {
  delete process.env['NODE_ENV']

  var app = matador.createApp(__dirname, {}, {})

  test.equals(app.getEnv(), 'development')
  test.done()
}

exports.testLoadsDevelopmentByDefault = function (test) {
  var scout = false
  var app = matador.createApp(__dirname, {}, {})

  delete process.env['NODE_ENV']

  app.configure('development', function () {
    scout = true
  })

  test.ok(scout)
  test.done()
}

exports.testLoadsConfigurationByEnvironment = function (test) {
  var scout = false

  process.env['NODE_ENV'] = 'example'

  var app = matador.createApp(__dirname, {}, {})

  app.configure('example', function () {
    scout = true
  })

  test.equals(app.getEnv(), 'example')
  test.ok(scout)
  test.done()
}

exports.testDoesNotRunConfigurationFromOtherEnvs = function (test) {
  var scout = false

  process.env['NODE_ENV'] = 'example'

  var app = matador.createApp(__dirname, {}, {})

  app.configure('production', function () {
    scout = true
  })

  test.equals(app.getEnv(), 'example')
  test.ok(scout === false)
  test.done()
}
