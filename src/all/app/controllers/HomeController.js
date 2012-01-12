module.exports = require(app.set('controllers') + '/ApplicationController').extend()
  .methods({
    index: function () {
      this.render('index', {
        title: 'The Matador Framework'
      })
    }
  })