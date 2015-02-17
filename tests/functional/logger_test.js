// Copyright The Obvious Corporation 2013

require('../support/functional')

var matador = require('../../src/matador')
  , RequestMessage = require('../../src/RequestMessage')
  , semver = require('semver')

exports.testLogsRequest = function (test) {
  var app = matador.createApp(__dirname, {})
    , requestMessage = RequestMessage.buildDefaultMessage()
    , messages = []

  var fakeLogger = {
    info: function (message) {
      messages.push(message)
    }
  }

  app.use(app.requestLogger(requestMessage, fakeLogger))
  app.useCommonMiddleware()
  app.start()

  app.request()
  .get('/?hello=world')
  .end(function (res) {
    var messageLines = messages[0].split('\n')

    if (semver.gte(process.version, 'v0.12.0')) {
      // node v0.12 binds to ipv6 and ipv4
      test.ok(messageLines[0].indexOf('- GET /?hello=world (source ::1') >= 0, 'method not included in log')
    } else {
      test.ok(messageLines[0].indexOf('- GET /?hello=world (source 127.0.0.1)') >= 0, 'method not included in log')
    }
    test.ok(messageLines[1].indexOf('Parameters: {}') >= 0, 'parameters not included in log')
    test.ok(messageLines[2].indexOf('Query: {"hello":"world"}') >= 0, 'query strings not included in log')
    test.ok(messageLines[3].indexOf('Controller: Home.index') >= 0, 'controller#action not included in log')
    test.ok(messageLines[4].match(/Response: 200 in \d+ms \(5 bytes\)/), 'response code not included in log')

    test.done()
  })
}
