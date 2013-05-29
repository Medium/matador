var util = require('util')

module.exports = function (app, config) {
  var ApplicationController = app.getController('Application', true)

  /** @constructor */
  function HomeController() {
    ApplicationController.call(this)
  }

  util.inherits(HomeController, ApplicationController)

  HomeController.prototype.success = function (req, res) {
    res.statusCode = 200
    res.end('Success!')
  }

  HomeController.prototype.post_success = function (req, res) {
    res.statusCode = 200
    res.end('POST Success!')
  }

  return HomeController
}
