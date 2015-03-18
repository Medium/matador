var util = require('util')

module.exports = function (app, config) {
  var ApplicationController = app.getController('Application', true)

  /** @constructor */
  function HomeController() {
    ApplicationController.call(this)
  }

  util.inherits(HomeController, ApplicationController)

  HomeController.prototype.redirectPermanent = function (req, res) {
    res.redirectPermanent('/elsewhere')
  }

  HomeController.prototype.redirect = function (req, res) {
    res.redirect('/target')
  }

  HomeController.prototype.target = function (req, res) {
    res.statusCode = 200
    res.end('Success!')
  }

  HomeController.prototype.queryStrings = function (req, res) {
    res.statusCode = 200
    res.end(JSON.stringify(req.query))
  }

  return HomeController
}
