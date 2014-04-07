var fs = require('fs')
var util = require('util')

function Cache() {
  this._ = {}
}

Cache.prototype.get = function (k) {
  return this._[k] || undefined
}

Cache.prototype.set = function (k, v, r) {
  v = r ? new RegExp(v) : v
  return (this._[k] = v)
}

var cache = new Cache()

module.exports = function (app, config) {

  function StaticController() {
    app.controllers.Base.call(this)
    this.layout = false
  }
  util.inherits(StaticController, app.controllers.Base)

  StaticController.prototype.index = function (request, response) {
    var index
    var req = request.params[0]
    var place = app.set('public') + req
    if (!fs.existsSync(place)) {
      response.statusCode = 404
      return this.render(response, '404')
    }
    if (!fs.statSync(place).isDirectory()) {
      if (fs.statSync(index = place.replace(/\/*$/, '') + '/index.html')) {
        return response.send(cache.get(index) || cache.set(fs.readFileSync(index)))
      }
      return
    }
    var files = v(fs.readdirSync(app.set('public') + req)).map(function (f) {
      return '<a href="' + f + '">' + f + '</a>'
    })
    this.render(response, 'directory', {directory: req, files: files})
  }

  return StaticController
}
