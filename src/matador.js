var fs = require('fs')
  , express = module.exports = require('express')
  , path = require('path')
  , hogan = require('hogan')
  , klass = global.klass = require('klass')
  , v = global.v = require('valentine')
  , router = require('./router')
  , argv = module.exports.argv = require('optimist').argv
  , minifyViews = process.env.minify || false
var minify = function () {
  var r = /(<script[^>]*>[\s\S]+?<\/script>)/
    , scr = /^<script([^>]*)>([\s\S]+?)<\/script>/
    , white = /\s+/g
    , closeTags = />\s+</g
    , jsp = require('uglify-js').parser
    , pro = require('uglify-js').uglify
    , uglify = function (src) {
        try {
          var ast = jsp.parse(src)
          ast = pro.ast_squeeze(ast)
          return pro.gen_code(ast)
        }
        catch (ex) {
          return src
        }
      }
  return function (doc) {
    if (!minifyViews) return doc
    return doc.trim().replace(/ +/g, ' ').split(r).map(function (p, i, m) {
      return (m = p.match(scr)) ? '<script' + m[1] + '>' + uglify(m[2]) + '</script>' : p.replace(white, ' ')
    }).join('').replace(closeTags, '><')
  }
}()

function isDirectory(p) {
  try {
    return fs.statSync(p).isDirectory()
  }
  catch (ex) {
    return false
  }
}

module.exports.createApp = function (baseDir, configuration, options) {
  configuration = configuration || {}
  options = options || {}

  var appDir = baseDir + '/app'
    , fileCache = {'services': {}, 'helpers': {}, 'models': {}, 'controllers': {}}
    , objCache = {'services': {}, 'helpers': {}, 'models': {}, 'controllers': {}}
    , pathCache = {'services': {}, 'helpers': {}, 'models': {}, 'controllers': {}}
    , partialCache = {}
    , appDirs = [appDir].concat(v(function () {
        var dir = appDir + '/modules'
        return path.existsSync(dir) ? fs.readdirSync(dir) : []
      }()).map(function (dir) {
        return appDir + '/modules/' + dir
      }))
    , app = express.createServer()
    , loadFile = function (subdir, name, p) {
        if (typeof(fileCache[subdir][name]) !== 'undefined') return fileCache[subdir][name]

        var dir = v.find((p ? [p] : appDirs), function (dir) {
          var filename = dir + '/' + subdir + '/' + name + '.js'
          if (!path.existsSync(filename)) return false
          fileCache[subdir][name] = require(filename)(app, (configuration[subdir] && configuration[subdir][name] ? configuration[subdir][name] : {}))
          pathCache[subdir][name] = dir === appDir ? [appDir] : [dir, appDir]
          return true
        })
        if (!dir) throw new Error('Unable to find ' + subdir + '/' + name)

        return fileCache[subdir][name]
      }
    , loadClass = function (subdir, name, localName, definitionOnly) {
        if (definitionOnly) return loadFile(subdir, name)
        if (!objCache[subdir][name]) {
          var File = loadFile(subdir, name)
          objCache[subdir][name] = new File(localName, pathCache[subdir][name])
          objCache[subdir][name]._paths = pathCache[subdir][name]
        }
        return objCache[subdir][name]
      }
    , mountPublicDir = function (dir) {
      var directory = dir + '/public'
      path.existsSync(directory) && app.use(express.static(directory))
    }

  app.set('base_dir', appDir)
  app.set('public', appDir + '/public')
  v(appDirs).each(mountPublicDir)

  app.controllers = {
    Base: require('./BaseController')(app)
  }

  app.addModulePath = function (dir) {
    appDirs.push(dir)
    mountPublicDir(dir)
  }

  app.mount = function () {
    var router = require('./router')
      , self = this

    v.each(appDirs, function (dir) {
      var filename = dir + '/config/routes.js'
      if (!path.existsSync(filename)) return
      router.init(self, require(filename)(self))
    })
    // static directory server

    router.init(this, {
      root: [['get', /(.+)/, 'Static']]
    })
  }

  app.prefetch = function (options) {
    var self = this

    v.each(['helpers', 'models', 'services', 'controllers'], function (type) {
      v.each(appDirs, function (dir) {
        var d = dir + '/' + type
        if (!isDirectory(d)) return
        v.each(fs.readdirSync(d), function (file) {
          if (file.substr(file.length - 3) === '.js') file = file.substr(0, file.length - 3)
          loadFile(type, file, dir)
        })
      })
    })
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
  app.getPartials = function (viewDir) {
    var rootDir = app.set('base_dir')
    var viewSuffix = '.' + app.set('view engine')

    if (!partialCache[viewDir]) {

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
      partialCache[viewDir] = partials
    }

    // Note: This does more work than is necessary, since common parents of views will
    // be hit once for each view. If this turns out to be problematic we can cache at
    // intermediate folders as well.

    return partialCache[viewDir]
  }

  app.getService = function (name, definitionOnly) {
    return loadClass('services', name + 'Service', name, definitionOnly)
  }

  app.getController = function (name, definitionOnly) {
    if (app.controllers[name]) {
      return definitionOnly ? app.controllers[name] : new app.controllers[name](name, [])
    }
    else {
      return loadClass('controllers', name + 'Controller', name, definitionOnly)
    }
  }

  app.getModel = function (name, definitionOnly) {
    return loadClass('models', name + 'Model', name, definitionOnly)
  }

  app.getHelper = function (name) {
    return loadFile('helpers', name + 'Helper')
  }

  app.controllers.Static = require('./StaticController')(app)

  return app
}

module.exports.engine = {
  compile: function (source, options) {
    if (typeof source !== 'string') return source
    source = minify(source)
    return function (options) {
      options.locals = options.locals || {}
      options.partials = options.partials || {}
      if (options.body) options.locals.body = options.body
      for (var i in options.partials) {
        if (v.is.fun(options.partials[i].r)) continue
        try {
          options.partials[i] = hogan.compile(options.partials[i])
        } catch (e) {
          console.log("Unable to compile partial", i, e)
        }
      }
      return hogan.compile(source, options).render(options.locals, options.partials)
    }
  }
}
