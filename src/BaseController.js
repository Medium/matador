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
        data = data || {}
        var layoutFile = findLayoutFile(this._paths, this.layout)
        var viewFile = findViewFile(this._paths, view)

        // Start looking for partials in the same directory as the view file.
        var partialsDir = path.resolve(viewFile, '../')

        return res.render(viewFile, {
            layout: layoutFile
          , locals: data
          , partials: app.getPartials(partialsDir)
          }, fn
        )
      }
    })

  /**
   * Searches through a set of paths for a matching view file.
   */
  function findViewFile(paths, view) {
    if (!viewCache[view]) {
      viewCache[view] = findFile(paths, 'views/' + view + '.' + app.set('view engine'))
    }
    return viewCache[view]
  }

  /**
   * Searches through a set of paths for a matching layout file.
   */
  function findLayoutFile(paths, layout) {
    if (!layoutCache[layout]) {
      var suffix = '.' + app.set('view engine')
      var layoutPath = findFile(paths, 'views/' + layout + suffix)
      layoutCache[layout] = layoutPath ? layoutPath.substr(0, suffix.length) : layout
    }
    return layoutCache[layout]
  }

  /**
   * Searches a set of paths for a given file, returning the full path if it is found.
   */
  function findFile(paths, file) {
    for (var i = 0; i < paths.length; i++) {
      var filePath = path.resolve(paths[i], file)
      if (path.existsSync(filePath)) {
        return filePath
      }
    }
    return null
  }

}


