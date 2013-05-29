var soynode = require('soynode')
  , DEFAULT_LAYOUT = 'layout'
  , DEFAULT_CLOSURE_LAYOUT = 'soy:views.layout.layout'
  , CLOSURE_LAYOUT_BODY_HTML_KEY = 'bodyHtml'

function SoyTemplateEngine() {
}

SoyTemplateEngine.prototype.appliesToTemplate = function (templateName) {
  var prefix = templateName.substring(0, templateName.indexOf(':'))
  return prefix === 'soy'
}

SoyTemplateEngine.prototype.renderTemplate = function (templateName, data, layout, injectedData) {
  // NOTE: The Express template rendering system assumes that all template names
  // are file names, whereas multiple closure templates exist in a single soy file,
  // so we short-circuit the rendering framework altogether. The only loss of functionality
  // is caching, but soynode gives that to us for free.
  return this._renderClosureTemplate(
    templateName.substring(4), data, layout, injectedData
  )
}

/**
 * Strips the soy prefix if found and returns the result.
 * @param {string} name to be stripped.
 * @return {string} the original name or stripped result.
 */
SoyTemplateEngine.prototype._maybeStripSoyPrefix = function (name) {
  var prefix = name.substring(0, name.indexOf(':'))
  return (prefix == 'soy') ? name.substring(4) : name
}

/**
 * Returns the closure layout template. Note that the layout can be overridden in data.
 * @param {Object} data the soy data object.
 * @param {*} the layout requested.
 */
SoyTemplateEngine.prototype._getClosureLayout = function (data, layout) {
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
SoyTemplateEngine.prototype._renderClosureTemplate = function (templateName, data, layout, opt_injectedData) {
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


module.exports = SoyTemplateEngine
