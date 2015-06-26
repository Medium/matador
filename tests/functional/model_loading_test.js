// Copyright The Obvious Corporation 2013

var request = require('../support/functional')

var matador = require('../../src/matador')

exports.testModelsAreLoaded = function (test) {
  var app = matador.createApp(__dirname, {})
    , model = app.getModel('Test', true)

  test.ok(model.call && model.apply)
  test.ok(model.test)
  test.done()
}
