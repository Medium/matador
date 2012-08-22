var fs = require('fs')
  , path = require('path')
  , soynode = require('soynode')
  , existsSync = fs.existsSync || path.existsSync

module.exports = function (app) {
  var viewCache = {}
    , layoutCache = {}
    , DEFAULT_LAYOUT = 'layout'
    , DEFAULT_CLOSURE_LAYOUT = 'soy:views.layout.layout'
    , CLOSURE_LAYOUT_BODY_HTML_KEY = 'bodyHtml'

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

        var prefix = view.substring(0, view.indexOf(':'))
        if (prefix == 'soy') {
          // NOTE: The Express template rendering system assumes that all template names
          // are file names, whereas multiple closure templates exist in a single soy file,
          // so we short-circuit the rendering framework altogether. The only loss of functionality
          // is caching, but soynode gives that to us for free.
          var output = renderClosureTemplate(
              view.substring(4), data, this.layout, opt_injectedData)
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
   * Strips the soy prefix if found and returns the result.
   * @param {string} name to be stripped.
   * @return {string} the original name or stripped result.
   */
  function maybeStripSoyPrefix(name) {
    var prefix = name.substring(0, name.indexOf(':'))
    return (prefix == 'soy') ? name.substring(4) : name
  }

  /**
   * Returns the closure layout template. Note that the layout can be overridden in data.
   * @param {Object} data the soy data object.
   * @param {*} the layout requested.
   */
  function getClosureLayout(data, layout) {
    // If an override is specified, then use it.
    if (typeof data['layout'] !== 'undefined') {
      layout = data['layout']
    }

    // If the layout specified is a string, remap the default layout to the Closure version.
    if (typeof layout === 'string') {
      layout = (layout === DEFAULT_LAYOUT) ? DEFAULT_CLOSURE_LAYOUT : layout
    } else if (layout || typeof layout === 'undefined') {
      layout = DEFAULT_CLOSURE_LAYOUT
    }

    return layout ? maybeStripSoyPrefix(layout) : layout
  }

  /**
   * Renders a closure template that has already been compiled.
   * @param {string} templateName
   * @param {Object} data
   * @param {*} layout
   * @param {Object=} opt_injectedData optional injected data for $ij
   */
  function renderClosureTemplate (templateName, data, layout, opt_injectedData) {
    var templateFn = soynode.get(templateName)
    if (!templateFn) {
      throw new Error('Unable to find template: ' + templateName)
    }

    var layoutFn = null
    layout = getClosureLayout(data, layout)
    if (layout) {
      layoutFn = soynode.get(layout)
      if (!layoutFn) {
        throw new Error('Unable to find layout template: ' + layout)
      }
    }

    var ijData = opt_injectedData || {}
    if (!layoutFn) {
      return templateFn(data, null, ijData)
    }

    ijData[CLOSURE_LAYOUT_BODY_HTML_KEY] = templateFn(data, null, ijData)
    return layoutFn(data, null, ijData)
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
      if (existsSync(filePath)) {
        return filePath
      }
    }
    return null
  }

}


