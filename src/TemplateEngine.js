/**
 * @fileoverview
 * This class is responsible for finding and rendering templates.
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

module.exports = TemplateEngine
