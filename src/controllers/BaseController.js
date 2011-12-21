var beforeFilters = []
  , excludeFilters = []

module.exports = Class(function (req, res) {
  this.response = res
  this.request = req
  this.layout = 'layout'
  this._viewFolder = ''
  this.controller = 'base'
  beforeFilters = []
  excludeFilters = []
  this.__defineGetter__('filters', function () {
    return beforeFilters
  })
  this.__defineGetter__('excludeFilters', function () {
    return excludeFilters
  })
  this.__defineSetter__('viewFolder', function (val) {
    this._viewFolder = val
  })
  this.__defineGetter__('viewFolder', function () {
    return this._viewFolder + '/'
  })
})
  .methods({
    getModel: function (name) {
      if (app.set('modelCache')[name]) return app.set('modelCache')[name]
      return (app.set('modelCache')[name] = new (require(app.set('models') + '/' + name + 'Model')))
    }
  , getHelper: function (name) {
      return require(app.set('helpers') + '/' + name)
    }
  , render: function (view, data, fn) {
      data = data || {}
      data.controller = this.controller
      this.response.render(this.viewFolder + view, {
          layout: this.layout
        , partials: getViewPartials(this.viewFolder)
        , locals: data
      }, fn)
    }
  , addBeforeFilter: function (actions, fn) {
      if (!fn) { fn = actions, actions = null }
      v(v.is.arr(actions) ? actions : [actions]).each(function (action) {
        beforeFilters.push({
            action: action
          , filter: fn
        })
      })
    }
  , addExcludeFilter: function (actions, fn) {
      v(v.is.arr(actions) ? actions : [actions]).each(function (action) {
        excludeFilters.push({
            action: action
          , filter: fn
        })
      })
    }
  })