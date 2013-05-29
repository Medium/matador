var util = require('util')

module.exports = function (app, config) {
  var ApplicationController = app.getController('Application', true)

  /** @constructor */
  function TemplateController() {
    ApplicationController.call(this)
  }

  util.inherits(TemplateController, ApplicationController)

  TemplateController.prototype.soy = function (req, res) {
    this.render(res, 'soy:views.template.hello', {
      title: 'The Matador Framework'
    })
  }

  TemplateController.prototype.hogan = function (req, res) {
    var data = {title: 'The Matador Framework'}
    this.render(res, 'hogan', data)
  }

  return TemplateController
}
