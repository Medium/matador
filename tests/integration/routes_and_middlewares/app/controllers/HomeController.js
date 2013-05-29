var util = require('util')

module.exports = function (app, config) {
  var ApplicationController = app.getController('Application', true)

  /** @constructor */
  function HomeController() {
    ApplicationController.call(this)

    this.addBeforeFilter(function (req, res, done) {
      res.setHeader('X-GlobalBeforeFilter', 'Works')
      done()
    })

    this.addBeforeFilter('success', function (req, res, done) {
      res.setHeader('X-LocalBeforeFilter', 'Works')
      done()
    })
  }

  util.inherits(HomeController, ApplicationController)

  HomeController.prototype.index = function (req, res) {
    res.statusCode = 200
    res.end('index')
  }

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
