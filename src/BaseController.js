var fs = require('fs')
  , path = require('path')
  , existsSync = fs.existsSync || path.existsSync
  , SoyNodeTemplateEngine = require('template_engines/SoyNodeTemplateEngine')

module.exports = function (app) {
  var viewCache = {}
    , layoutCache = {}
    , DEFAULT_LAYOUT = 'layout'

  return klass(function () {
    this._paths = [app.set('base_dir')]
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

        var soyNodeTemplateEngine = new SoyNodeTemplateEngine()
        if (soyNodeTemplateEngine.appliesToTemplate(view)) {
          var output = soyNodeTemplateEngine.renderTemplate(
            view, data, this.layout, opt_injectedData
          )

          return fn ? fn(output) : res.send(output)
        }

        var layoutFile
        if (typeof data.layout != 'undefined' && data.layout !== true) {
          layoutFile = data.layout ? findLayoutFile(this._paths, data.layout) : false
        } else {
          layoutFile = findLayoutFile(this._paths, this.layout)
        }

        var viewFile = findViewFile(this._paths, view)

        // Start looking for partials in the same directory as the view file.
        var partialsDir = path.resolve(viewFile, '../')

        try {
          return res.render(viewFile, {
              layout: layoutFile
            , locals: data
            , partials: app.getPartials(partialsDir)
            }, fn)
        } catch (e) {
          console.error('Rendering error, view:', viewFile, 'layout:', layoutFile, 'error:', e.message, e.stack)
          throw e
        }
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
      layoutCache[layout] = layoutPath ? layoutPath.substr(0, layoutPath.length - suffix.length) : layout
    }
    return layoutCache[layout]
  }

  /**
   * Searches a set of paths for a given file, returning the full path if it is found.
   */
  function findFile(paths, file) {
    for (var i = 0; i < paths.length; i++) {
      var filePath = path.resolve(paths[i], file)
      if (existsSync(filePath)) {
        return filePath
      }
    }
    return null
  }

}


