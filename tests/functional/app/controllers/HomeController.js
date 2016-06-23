var util = require('util')

module.exports = function (app, config) {
  function HomeController() {
    app.controllers.Base.call(this)
  }

  util.inherits(HomeController, app.controllers.Base)

  HomeController.prototype.index = function(req, res) {
    return res.send('hello')
  }

  HomeController.prototype.wildcard = function(req, res) {
    var matched = req.params['*'] || []
    return res.send(matched.join(', '))
  }

  HomeController.prototype.name = function(req, res) {
    return res.send(req.params['name'] || '')
  }

  return HomeController
}
