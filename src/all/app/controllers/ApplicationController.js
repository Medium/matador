module.exports = require('./BaseController').extend(function () {
  this.viewFolder = ''
  this.layout = 'layout'
})
  .methods({
    render: function (view, data, fn) {
      data = data || {}
      this.response.render(this.viewFolder + view, {
          layout: this.layout
        , locals: data
      }, fn)
    }
  })