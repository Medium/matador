module.exports = function (app) {
  var viewCache = {}
    , DEFAULT_LAYOUT = 'layout'

  return klass(function () {
    this.beforeFilters = {}
    this.excludeFilters = {}
    var viewOptions = app.set('view options')
    this.layout = (viewOptions && typeof viewOptions.layout !== 'undefined') ? viewOptions.layout : DEFAULT_LAYOUT
  })
    .methods({
      addBeforeFilter: function (actions, fn) {
        if (!fn) {
          fn = actions
          actions = '*'
        }
        v(v.is.arr(actions) ? actions : [actions]).each(function (action) {
          if (typeof this.beforeFilters[action] === 'undefined') this.beforeFilters[action] = []
          this.beforeFilters[action].push(fn)
        }, this)
      }

    , addExcludeFilter: function (actions, fn) {
        v(v.is.arr(actions) ? actions : [actions]).each(function (action) {
          if (typeof this.excludeFilters[action] === 'undefined') this.excludeFilters[action] = []
          this.excludeFilters[action].push(fn)
        }, this)
      }

    , json: function (res, data, headers, status) {
        var body = JSON.stringify(data)

        var xssiPrefix = app.set('xssi prefix')
        if (xssiPrefix) body = xssiPrefix + body

        res.header('Content-Type', 'application/json')
        res.charset = 'utf-8'
        res.send(body, headers, status)
      }

    , error: function (res) {
        res.send('An error occurred', {}, 400)
      }

    , render: function (res, view, data, fn, opt_injectedData) {
        data = data || {}

        var output = app.templateEngine.renderTemplate(
          view, data, this.layout, opt_injectedData
        )

        return fn ? fn(output) : res.send(output)
      }
    })
}
