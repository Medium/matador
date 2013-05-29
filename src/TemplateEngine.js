/**
 * @fileoverview
 * This class is responsible for finding and rendering templates.
 * 
 * TODO: Move the logic from BaseController into Template engines.
 */
var fs = require('fs')
  , path = require('path')
  , existsSync = fs.existsSync || path.existsSync
  , soynode = require('soynode')
  , DEFAULT_CLOSURE_LAYOUT = 'soy:views.layout.layout'
  , CLOSURE_LAYOUT_BODY_HTML_KEY = 'bodyHtml'

function TemplateEngine() {
  this._templateCache = {}
  this._templateEngines = {}
}

function SoyTemplateEngine() {
}

SoyTemplateEngine.prototype.appliesToTemplate = function (templateName) {
  var prefix = templateName.substring(0, view.indexOf(':'))
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

/**
 * Adds support for a new engine based on file suffix
 * @param {string} suffix the type of file to use the specified engine
 * @param {function} engine the engine to be used.
 */
TemplateEngine.prototype.addEngine = function (suffix, engine) {
  if (typeof engine === 'undefined') {
    engine = suffix
    suffix = '.html'
  }
  this._templateEngines[suffix] = engine
}

/**
 * Take in a template name and options and call a callback with a compiler. This is only temporarily
 * as we're changing up our template system to be non-file specific (to allow for engines like
 * soynode)
 *
 * @param {string} templateName
 * @param {Object} options
 * @param {Function} callback
 */
TemplateEngine.prototype.getTemplate = function (templateName, options, callback) {
  // is the template already cached?
  if (this._templateCache[templateName]) return callback(null, this._templateCache[templateName])

  // check if it has a suffix already applied
  var matches = templateName.match(/(\.[\w]+)$/)
  var suffix
  if (!matches) {
    suffix = '.html'
    templateName += '.html'
  } else {
    suffix = matches[0]
  }

  // is there an engine for the provided suffix?
  var engine = this._templateEngines[suffix]
  if (!engine) return callback(new Error('No engine found for template type ' + suffix))

  // does the template exist?
  if (!existsSync(templateName)) return callback(new Error('Template \'' + templateName + '\' does not exist'))

  // read the template in, cache, and call the callback
  fs.readFile(templateName, 'utf8', function (err, data) {
    if (err) return callback(err)
    try {
      this._templateCache[templateName] = engine.compile(data, options)
    } catch (e) {
      return callback(e)
    }
    return callback(null, this._templateCache[templateName])
  }.bind(this))
}

/**
 * Creates a function that is capable of rendering templates in a response
 * object.
 * @param {http.HttpResponse} response HTTP response object that will render
 * the resulted template.
 * @return {Function} A function that renders templateName on the response
 * object.
 */
TemplateEngine.prototype.createRenderer = function (response) {
  return function renderResponse(templateName, options, callback) {
    // get the requested template compiler
    this.getTemplate(templateName, options, function (err, compiler) {
      // no template, exit out
      if (err) {
        console.error(err)
        response.send(err.message)
      }

      // compile the template
      var output = compiler(options)

      // no layout specified, return the compiled template
      if (!options.layout) return callback ? callback(output) : response.send(output)

      // layout was specified, retrieve the layout template
      this.getTemplate(options.layout, options, function (err, compiler) {
        //no layout template, exit out
        if (err) {
          console.error(err)
          response.send(err.message)
        }

        //set the body in the options to the previous compiled template and compile
        options.body = output
        output = compiler(options)

        //return the compiled template
        callback ? callback(output) : response.send(output)
      }.bind(this))
    }.bind(this))
  }.bind(this)
}
module.exports = TemplateEngine
