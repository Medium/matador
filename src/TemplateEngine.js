/**
 * @fileoverview
 * This class is responsible for finding and rendering templates.
 * 
 * TODO: Move the logic from BaseController into Template engines.
 */
var fs = require('fs')
  , path = require('path')
  , existsSync = fs.existsSync || path.existsSync

function TemplateEngine() {
  this._templateCache = {}
  this._templateEngines = {}
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
