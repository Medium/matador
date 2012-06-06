var fs = require('fs')
  , path = require('path')
  , soynode = require('soynode')

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
        var body = JSON.stringify(data)

        var xssiPrefix = app.set('xssi prefix')
        if (xssiPrefix) body = xssiPrefix + body

        res.header('Content-Type', 'application/json')
        res.charset = 'utf-8'
        res.send(body, headers, status)
      }

    , error: function (res) {
        res.send(400)
      }

    , render: function (res, view, data, fn) {
        data = data || {}

        var prefix = view.substring(0, view.indexOf(':'))
        if (prefix == 'soy') {
          // NOTE: The Express template rendering system assumes that all template names
          // are file names, whereas multiple closure templates exist in a single soy file,
          // so we short-circuit the rendering framework altogether. The only loss of functionality
          // is caching, but soynode gives that to us for free.
          var output = renderClosureTemplate(view.substring(4), data, fn)
          return fn ? fn(output) : res.send(output)
        }

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
   * Renders a closure template that has already been compiled.
   */
  function renderClosureTemplate (templateName, data) {
    var templateFunction = soynode.get(templateName)
    if (!templateFunction) {
      throw new Error('Unable to find template: ' + templateName)
    }
    return templateFunction(data)
  }

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
      if (path.existsSync(filePath)) {
        return filePath
      }
    }
    return null
  }

}


