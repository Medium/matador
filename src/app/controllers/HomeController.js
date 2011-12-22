module.exports = require('./ApplicationController').extend()
  .methods({
    index: function () {
      this.response.render('index', {
        title: 'The Matador Framework'
      })
    }
  })