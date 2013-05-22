var util = require('util')

module.exports = function (app, config) {
  function ApplicationController() {
    app.controllers.Base.call(this)
  }

  util.inherits(ApplicationController, app.controllers.Base)

  return ApplicationController
}
