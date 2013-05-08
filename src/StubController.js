var util = require('util')

module.exports = function (app, config) {
  var ApplicationController = app.getController('Application', true)

  /** @constructor */
  function StubController() {
    ApplicationController.call(this)
  }

  util.inherits(StubController, ApplicationController)

  StubController.prototype.index = function (req, res) {

  }

  return StubController
}
