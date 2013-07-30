var util = require('util')

module.exports = function (app, config) {
  var ApplicationController = app.getController('Application', true)

  /** @constructor */
  function HomeController() {
    ApplicationController.call(this)
  }

  util.inherits(HomeController, ApplicationController)

  HomeController.prototype.index = function (req, res) {
    res.end('It works')
  }

  return HomeController
}
