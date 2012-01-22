var pr = require('./partialRenderer')

module.exports = Class(function (req, res, next) {
  this.response = res
  this.request = req
  this.next = next
  this._viewFolder = ''

  var viewOptions = app.set('view options')
  this.layout = (viewOptions && 'undefined' !== typeof viewOptions.layout) ? viewOptions.layout : 'layout'

  this.beforeFilters = []
  this.excludeFilters = []

  this.__defineSetter__('viewFolder', function (val) {
    this._viewFolder = val
  })
  this.__defineGetter__('viewFolder', function () {
    return this._viewFolder ? this._viewFolder + '/' : ''
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
      this.response.render(this.viewFolder + view, {
          layout: this.layout
        , locals: data
        , partials: pr.get(this.viewFolder, app.set('viewPartials'))
      }, fn)
    }
  , addBeforeFilter: function (actions, fn) {
      if (!fn) { fn = actions, actions = null }
      v(v.is.arr(actions) ? actions : [actions]).each(function (action) {
        this.beforeFilters.push({
            action: action
          , filter: fn
        })
      }, this)
    }
  , addExcludeFilter: function (actions, fn) {
      v(v.is.arr(actions) ? actions : [actions]).each(function (action) {
        this.excludeFilters.push({
            action: action
          , filter: fn
        })
      }, this)
    }
  , json: function(data, headers, status){
      this.response.json(data, headers, status)
    }
  , error: function () {
      this.response.send(400)
    }
  })
