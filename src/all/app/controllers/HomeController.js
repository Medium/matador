module.exports = function (app, config) {
  var HomeController = app.getController('Application', true).extend()

  HomeController.prototype.index = function (req, res) {
    var data = {title: 'The Matador Framework'}
    var query = require('url').parse(req.path, true).query
    if (query.fragment) data.layout = false
    this.render(res, 'index', data)
  }

  return HomeController
}
