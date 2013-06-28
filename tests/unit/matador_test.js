var matador = require('../../src/matador');

exports.testGetAndSet = function (test) {
  var app = matador.createApp(__dirname, {}, {})
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
