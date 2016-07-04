// Copyright The Obvious Corporation 2013

var soynode = require('soynode')
  , isDirectory = require('./fsutils').isDirectory
  , DEFAULT_LAYOUT = 'layout'
  , DEFAULT_CLOSURE_LAYOUT = 'views.layout.layout'
  , CLOSURE_LAYOUT_BODY_HTML_KEY = 'bodyHtml'

function TemplateEngine() {
}

var nullFunction = function () {}
var defaultCallback = function (err) {
  if (err) {
    throw err
  }
}

/**
 * Precompile templates and setup soynode options
 * @param {Array} searchPaths path to look for views
 * @param {Object} options soynode options
 * @param {Function} callback called after compilation finishes
 */
TemplateEngine.prototype.precompileTemplates = function (searchPaths, options, callback) {
  callback = callback || defaultCallback

  soynode.setOptions(options)

  var pathsLeft = searchPaths.length

  function onPathDone(dir, err) {
    if (dir) {
      console.log('Done compiling templates in', dir)
    }
    pathsLeft--

    if (err) {
      callback(err)
      callback = nullFunction
    } else if (pathsLeft === 0) {
      callback()
      callback = nullFunction
    }
  }

  // Precompile all Closure templates.
  searchPaths.forEach(function (dir) {
    dir = dir + '/views'

    if (!isDirectory(dir)) {
      onPathDone(null, null)
      return
    }

    console.log('Compiling Templates in', dir)
    soynode.compileTemplates(dir, onPathDone.bind(null, dir))
  })
}

/**
 * Renders a SoyNode template based on a name. Supports both
 * soy:views.template.name and views.template.name template names.
 * @param {string} templateName the template name to be rendered
 * @param {Object} data data to be passed to the template
 * @param {string} layout layout to render templateName in
 * @return {string} HTML output
 */
TemplateEngine.prototype.renderTemplate = function (templateName, data, layout, injectedData) {
  // NOTE: The Express template rendering system assumes that all template names
  // are file names, whereas multiple closure templates exist in a single soy file,
  // so we short-circuit the rendering framework altogether. The only loss of functionality
  // is caching, but soynode gives that to us for free.
  return this._renderClosureTemplate(
    this._maybeStripSoyPrefix(templateName), data, layout, injectedData
  )
}

/**
 * Strips the soy prefix if found and returns the result.
 * @param {string} name to be stripped.
 * @return {string} the original name or stripped result.
 */
TemplateEngine.prototype._maybeStripSoyPrefix = function (name) {
  var prefix = name.substring(0, name.indexOf(':'))
  return (prefix == 'soy') ? name.substring(4) : name
}

/**
 * Returns the closure layout template. Note that the layout can be overridden in data.
 * @param {Object} data the soy data object.
 * @param {*} the layout requested.
 */
TemplateEngine.prototype._getClosureLayout = function (data, layout) {
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

  return layout ? this._maybeStripSoyPrefix(layout) : layout
}

/**
 * Renders a closure template that has already been compiled.
 * @param {string} templateName
 * @param {Object} data
 * @param {*} layout
 * @param {Object=} opt_injectedData optional injected data for $ij
 */
TemplateEngine.prototype._renderClosureTemplate = function (templateName, data, layout, opt_injectedData) {
  var templateFn = soynode.get(templateName)
  if (!templateFn) {
    throw new Error('Unable to find template: ' + templateName)
  }

  var layoutFn = null
  layout = this._getClosureLayout(data, layout)
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


module.exports = TemplateEngine
