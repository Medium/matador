module.exports = function (app, config) {

  var util = require('util')
  var AppModel = app.getModel('Application', true)

  function StubModel() {
    AppModel.call(this)
  }
  util.inherits(StubModel, AppModel)

  return StubModel

}
