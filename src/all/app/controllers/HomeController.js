module.exports = require('./ApplicationController').extend()
  .methods({
    index: function () {
      this.render('index', {
        title: 'The Matador Framework'
      })
    }
  })