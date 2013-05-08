module.exports = function (app, config) {
  var SoyController = app.getController('Application', true).extend()

  SoyController.prototype.index = function (req, res) {
      this.render(res, 'soy:views.index.welcome', {
        title: 'The Matador Framework'
      })
  }

  return SoyController
}
