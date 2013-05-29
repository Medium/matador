var hogan = require('hogan.js')
  , path = require('path')
  , fs = require('fs')
  , existsSync = fs.existsSync || path.existsSync

function HoganTemplateEngine(app) {
  this._layoutCache = {}
  this._partialCache = {}
  this._viewCache = {}
  this._app = app
  this._paths = [app.set('base_dir')]
}

HoganTemplateEngine.prototype.renderTemplate = function (res, fn, templateName, data, layout, injectedData) {
  var layoutFile
  if (typeof data.layout != 'undefined' && data.layout !== true) {
    layoutFile = data.layout ? this._findLayoutFile(this._paths, data.layout) : false
  } else {
    layoutFile = this._findLayoutFile(this._paths, this.layout)
  }

  var viewFile = this._findViewFile(this._paths, templateName)

  // Start looking for partials in the same directory as the view file.
  var partialsDir = path.resolve(viewFile, '../')

  try {
    return res.render(viewFile, {
        layout: layoutFile
      , locals: data
      , partials: this._getPartials(partialsDir)
      }, fn)
  } catch (e) {
    console.error('Rendering error, view:', viewFile, 'layout:', layoutFile, 'error:', e.message, e.stack)
    throw e
  }
}

/**
 * Searches a set of paths for a given file, returning the full path if it is found.
 */
HoganTemplateEngine.prototype._findFile = function (paths, file) {
  for (var i = 0; i < paths.length; i++) {
    var filePath = path.resolve(paths[i], file)
    if (existsSync(filePath)) {
      return filePath
    }
  }
  return null
}

/**
 * Searches through a set of paths for a matching layout file.
 */
HoganTemplateEngine.prototype._findLayoutFile = function (paths, layout) {
  if (!this._layoutCache[layout]) {
    var suffix = '.' + this._app.set('view engine')
    var layoutPath = this._findFile(paths, 'views/' + layout + suffix)
    this._layoutCache[layout] = layoutPath ? layoutPath.substr(0, layoutPath.length - suffix.length) : layout
  }
  return this._layoutCache[layout]
}

/**
 * Searches through a set of paths for a matching view file.
 */
HoganTemplateEngine.prototype._findViewFile = function (paths, view) {
  if (!this._viewCache[view]) {
    this._viewCache[view] = this._findFile(paths, 'views/' + view + '.' + this._app.set('view engine'))
  }
  return this._viewCache[view]
}

/**
 * Finds all partial templates relative to the provided view directory, stopping once the root
 * directory has been reached.
 *
 * All templates are added from the /partials/ folder within the current view directory.  We then
 * move to the parent directory and add any partials from it's /partials/ folder that don't conflict
 * with ones already added. We then move to the next parent directory and so on until we reach the
 * application root.
 *
 * This allows views to use common templates, and be able to override sub-templates.
 *
 * Example: consider the following directory structure:
 *   app/
 *       views/
 *           partials/
 *               user-details.html  - contains {{> user-link}})
 *               user-link.html
 *           search/
 *               results.html - contains {{> user-details}}
 *               partials/
 *                   user-link.html
 *           post/
 *               post.html  - contains {{> user-details}}
 *
 * The partials for app/views/search will contain:
 *   app/views/search/partial/user-link.html
 *   app/views/partial/user-details.html
 *
 * The partials for app/views/post will only contain app/views/partials/%
 *
 *
 * TODO: This uses synchronous filesystem APIs. It should either be performed at start up
 * for all controllers or else switched to use async APIs.
 */
HoganTemplateEngine.prototype._getPartials = function (viewDir) {
  var rootDir = this._app.set('base_dir')
  var viewSuffix = '.' + this._app.set('view engine')

  if (!this._partialCache[viewDir]) {

    if (path.relative(rootDir, viewDir).indexOf('../') != -1) {
      throw new Error('View directories must live beneath the application root.')
    }

    var partials = {}
    while (viewDir != rootDir) {
      var partialDir = path.resolve(viewDir, 'partials')
      try {
        fs.readdirSync(partialDir).forEach(function (file) {
          // Ignore hidden files and files that don't have the right extension.
          if (file.charAt(0) == '.') return
          if (file.substr(-viewSuffix.length) != viewSuffix) return

          // Remove the suffix, such that /partials/something.html can be used as {{> something}}
          var partialName = file.substr(0, file.length - viewSuffix.length)

          // If the map already contains this partial it means it has already been specified higher
          // up the view hierarchy.
          if (!partials[partialName]) {
            var partialFilename = path.resolve(partialDir, file)
            try {
              var partialContent = fs.readFileSync(partialFilename, 'utf8')
              partials[partialName] = hogan.compile(minify(partialContent))
            } catch (e) {
              console.log('Unable to compile partial', partialFilename, e)
            }
          }
        })
      } catch (e) {
        // Only log errors if they are not a "no such file or directory" error, since we expect
        // those to happen. (Saves us an fs.statSync.)
        if (e.code != 'ENOENT') console.log('Unable to read partials directory', partialDir, e)
      }
      viewDir = path.resolve(viewDir, '../')
    }
    this._partialCache[viewDir] = partials
  }

  // Note: This does more work than is necessary, since common parents of views will
  // be hit once for each view. If this turns out to be problematic we can cache at
  // intermediate folders as well.

  return this._partialCache[viewDir]
}

module.exports = HoganTemplateEngine
