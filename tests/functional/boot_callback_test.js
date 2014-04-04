// Copyright The Obvious Corporation 2013

require('../support/functional')

var matador = require('../../src/matador')
  , RequestMessage = require('../../src/RequestMessage')

exports.testAfterBootCallbackRuns = function (test) {
  var app = matador.createApp(__dirname, {})
  var booted = false
  var spy = false

  app.on('afterBoot', function () {
    booted = true
    app.use(function (req, res, next) {
      spy = true
      next()
    })
  })

  app.useCommonMiddleware()
  app.start()

  app.request()
  .get('/')
  .end(function (res) {
    test.ok(booted, 'AfterBoot is not being called')
    test.ok(spy, 'Middleware is not being run')
    test.done()
  })
}
