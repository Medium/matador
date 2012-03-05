var fs = require('fs')
  , path = require('path')

module.exports = function (app) {
  var viewCache = {}
    , layoutCache = {}

  return klass(function () {
    this._paths = [app.set('base_dir')]
    this.beforeFilters = {}
    this.excludeFilters = {}
    var viewOptions = app.set('view options')
    this.layout = (viewOptions && typeof viewOptions.layout !== 'undefined') ? viewOptions.layout : 'layout'
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
        res.json(data, headers, status)
      }

    , error: function (res) {
        res.send(400)
      }

    , render: function (res, view, data, fn) {
        if (!viewCache[view]) {
          var suffix = '.' + app.set('view engine')
          v.find(this._paths, function (p) {
            try {
              var viewFile = p + '/views/' + view
              fs.statSync(viewFile + suffix)
              viewCache[view] = viewFile
              return true
            }
            catch (e) {
              return false
            }
          })
        }
        
        if (!layoutCache[this.layout]) {
          var layoutPath = v(this._paths).find(function (_path) {
            return path.existsSync(_path + "/views/" + this.layout + suffix)
          }.bind(this)
          layoutCache[this.layout] = layoutPath ? layoutPath + "/views/" + this.layout : this.layout
        }

        data = data || {}
        return res.render(viewCache[view], {
            layout: layoutCache[this.layout]
          , locals: data
          , partials: app.getPartials(this._paths)
          }, fn
        )
      }
    })
}


