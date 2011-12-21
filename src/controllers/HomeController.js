module.exports = require('./ApplicationController').extend()
  .methods({
    index: function () {
      this.response.send('<h1>Welcome to Matador</h1>')
    }
  })