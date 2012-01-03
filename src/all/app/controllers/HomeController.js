module.exports = require('./ApplicationController').extend()
  .methods({
    index: function () {
      this.response.render('index', {
        locals: {
          title: 'The Matador Framework'
        }
      })
    }
  })