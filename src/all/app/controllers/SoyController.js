var util = require('util')

module.exports = function (app, config) {
  var ApplicationController = app.getController('Application', true)

  /** @constructor */
  function SoyController() {
    ApplicationController.call(this)
  }

  util.inherits(SoyController, ApplicationController)

  SoyController.prototype.index = function (req, res) {
    this.render(res, 'soy:views.index.welcome', {
      title: 'The Matador Framework'
    })
  }

  return SoyController
}
