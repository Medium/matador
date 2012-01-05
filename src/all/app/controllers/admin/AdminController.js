module.exports = require('../ApplicationController').extend(function () {
  this.viewFolder = 'admin/'
})
  .methods({
    show: function () {
      this.render('index', {
          title: 'Admin Town'
        , area: 'Area 51'
      })
    }
  })