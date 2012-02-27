module.exports = function (app, config) {

  return app.getController("Application", true).extend()
  .methods({
    index: function (req, res) {

    }
  })

}