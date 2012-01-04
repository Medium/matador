module.exports = require('./BaseController').extend()
  .methods({
    render: function (view, data, fn) {
      data = data || {}
      data.controller = this.controller
      this.response.render(this.viewFolder + view, {
          layout: this.layout
        , locals: data
      }, fn)
    }
  })