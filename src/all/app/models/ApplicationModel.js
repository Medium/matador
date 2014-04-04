module.exports = function (app, config) {
  var util = require('util')
  var BaseModel = app.getModel('Base', true)

  function ApplicationModel() {
    BaseModel.call(this)
  }
  util.inherits(ApplicationModel, BaseModel)

  return ApplicationModel
}
