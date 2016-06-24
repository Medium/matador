// Copyright 2016. A Medium Corporation

var request = require('../support/functional')

var matador = require('../../src/matador')
  , RequestMessage = require('../../src/RequestMessage')

exports.testNamedParameterEscaping = function (test) {
  var app = matador.createApp(__dirname, {})
  app.useCommonMiddleware()
  app.start()

  request(app)
  .get('/name/' + encodeURIComponent('hello%20world'))
  .end(function (res) {
    test.equal(200, res.statusCode)
    test.equal('hello%20world', res.body)
    test.done()
  })
}

exports.testWildcardEscapedUrl = function (test) {
  var app = matador.createApp(__dirname, {})
  app.useCommonMiddleware()
  app.start()

  request(app)
  .get('/wildcard/' + encodeURIComponent('http://example.com/abc%5E123'))
  .end(function (res) {
    test.equal(200, res.statusCode)
    test.equal('http://example.com/abc%5E123', res.body)
    test.done()
  })
}

exports.testWildcardUnescapedUrl = function (test) {
  var app = matador.createApp(__dirname, {})
  app.useCommonMiddleware()
  app.start()

  request(app)
  .get('/wildcard/example.com/foo%3Fbar%3Dbaz')
  .end(function (res) {
    test.equal(200, res.statusCode)
    test.equal('example.com, foo?bar=baz', res.body)
    test.done()
  })
}

exports.testWildcardMatchingPath = function (test) {
  var app = matador.createApp(__dirname, {})
  app.useCommonMiddleware()
  app.start()

  request(app)
  .get('/wildcard/a/b%255Ec/d/e')
  .end(function (res) {
    test.equal(200, res.statusCode)
    test.equal('a, b%5Ec, d, e', res.body)
    test.done()
  })
}
