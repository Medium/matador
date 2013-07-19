var util = require('util')

module.exports = function (app, config) {
  function HomeController() {
    app.controllers.Base.call(this)
  }

  util.inherits(HomeController, app.controllers.Base)

  HomeController.prototype.index = function(req, res) {
    return res.send('hello')
  }


  return HomeController
}
