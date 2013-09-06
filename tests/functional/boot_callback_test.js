// Copyright The Obvious Corporation 2013

require('../support/functional')

var matador = require('../../src/matador')
  , RequestMessage = require('../../src/RequestMessage')

exports.testAfterBootCallbackRuns = function (test) {
  var app = matador.createApp(__dirname, {}, {})
    , spy = false

  app.boot(function () {
    app.use(function (req, res, next) {
      spy = true
      next()
    })
  })

  app.request()
  .get('/')
  .end(function (res) {
    test.ok(spy, 'Middleware is not being run')
    test.done()
  })
}
