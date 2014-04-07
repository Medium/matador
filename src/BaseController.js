module.exports = function (app) {
  var viewCache = {}
  var DEFAULT_LAYOUT = 'layout'

  function BaseController() {
    var viewOptions = app.set('view options')
    this.layout = (viewOptions && typeof viewOptions.layout !== 'undefined') ? viewOptions.layout : DEFAULT_LAYOUT
  }

  BaseController.prototype.json = function (res, data, headers, status) {
    var body = JSON.stringify(data)

    var xssiPrefix = app.set('xssi prefix')
    if (xssiPrefix) body = xssiPrefix + body

    res.setHeader('Content-Type', 'application/json')
    res.charset = 'utf-8'
    res.send(body, headers, status)
  }

  BaseController.prototype.error = function (res) {
    res.send('An error occurred', {}, 400)
  }

  BaseController.prototype.render = function (res, view, data, fn, opt_injectedData) {
    var output = app.templateEngine.renderTemplate(
      view, data || {}, this.layout, opt_injectedData)

    return fn ? fn(output) : res.send(output)
  }

  return BaseController
}
