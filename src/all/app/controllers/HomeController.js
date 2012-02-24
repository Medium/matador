module.exports = function(app,config) {
  return app.getController("Application", true).extend()
  .methods({
    index: function (req, res) {
      this.render(req, 'index', {
        title: 'The Matador Framework'
      })
    }
  })
}