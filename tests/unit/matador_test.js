var matador = require('../../src/matador');

exports.testGetAndSet = function (test) {
  var app = matador.createApp(__dirname, {})
  test.throws(function () {
    app.get('unsetKey')
  })
  test.throws(function () {
    app.get('unsetKey', undefined)
  })

  test.equal(1, app.get('unsetKey', 1))

  app.set('unsetKey', 2)
  test.equal(2, app.get('unsetKey', 1))

  test.done();
}

exports.testNestedConfig = function (test) {
  var app = matador.createApp(__dirname, {base: {a: 'A'}, services: {XService: {a: 'B'}}})
  test.equal('A', app.getConfig('services', 'YService').a)
  test.equal('B', app.getConfig('services', 'XService').a)
  test.done()
}

exports.testFlatConfig = function (test) {
  var app = matador.createApp(__dirname, {a: 'A', flatConfig: true})
  test.equal('A', app.getConfig('services', 'YService').a)
  test.done()
}

exports.testFlatConfigValidation = function (test) {
  try {
    matador.createApp(__dirname, {base: {a: 'A'}, flatConfig: true})
    test.fail('expected error')
  } catch (e) {
    test.ok(/Malformed config/.test(e.message), e)
  }
  test.done()
}
