// Copyright The Obvious Corporation 2013

var matador = require('../../src/matador')

exports.testFiresCreateHelper = function (test) {
  var app = matador.createApp(__dirname, {})

  app.on('createHelper', function (name) {
    test.equals(name, 'Dummy')
    test.done()
  })

  app.useCommonMiddleware()
  app.start()
}
