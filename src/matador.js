var fs = require('fs')
  , express = module.exports = require('express')
  , path = require('path')
  , hogan = require('hogan.js')
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
    , fileCache = {'services': {}, 'helpers': {}, 'models': {}, 'controllers': {}, 'config': {}}
    , objCache = {'services': {}, 'helpers': {}, 'models': {}, 'controllers': {}}
    , pathCache = {'services': {}, 'helpers': {}, 'models': {}, 'controllers': {}, 'config': {}}
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
          var base = dir + '/' + subdir + '/' + name
          var filename
          if (path.existsSync(base + '.js'))  {
            filename = base + '.js'
          } else if (path.existsSync(base + '.coffee')) {
            filename = base + '.coffee'
          } else {
            return false
          }

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

  app.set('base_dir', appDir)
  app.set('public', appDir + '/public')
  v(appDirs).each(function (dir) {
    var directory = dir + '/public'
    path.existsSync(directory) && app.use(express.static(directory))
  })

  app.controllers = {
    Base: require('./BaseController')(app)
  }

  app.mount = function () {
    var router = require('./router')
      , self = this

    v.each(appDirs, function (dir) {
      var routes = loadFile('config', 'routes', dir)
      if (routes) {
        router.init(self, routes)
      }
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
          if (file.substr(file.length - 3) === '.js') {
            file = file.substr(0, file.length - 3);
          }
          else if (file.substr(file.length - 7) === '.coffee') {
            file = file.substr(0, file.length - 7);
          }
          loadFile(type, file, dir)
        })
      })
    })
  }

  app.getPartials = function (paths) {
    var partials = {}
      , objs = v.map(paths, function (path) {
        if (!partialCache[path]) {
          var viewSuffix = '.' + app.set('view engine')
            , viewsRoot = path
            , pathPartials = {}
            , dirs = [viewsRoot]

          while (dirs.length) {
            var dir = dirs.shift()

            try {
              v.each(fs.readdirSync(dir), function (file) {
                var fullPath = dir + '/' + file
                  , stat = fs.statSync(fullPath)
                  , localDir = dir.substr(viewsRoot.length + 1)

                if (!stat.isDirectory()) return
                if (file !== 'partials') return dirs.push(fullPath)

                v.each(fs.readdirSync(fullPath), function (partial) {
                  var viewFile = localDir
                    + (localDir.length ? '/' : '')
                    + partial.substr(0, partial.length - viewSuffix.length)
                    , partialContent = fs.readFileSync(fullPath + '/' + partial, 'utf8')

                  pathPartials[viewFile] = hogan.compile(minify(partialContent))
                })
              })
            }
            catch (e) {}
          }
          partialCache[path] = pathPartials
        }

        return partialCache[path]
      })

    v.each(objs, function (obj) {
      v.each(obj, function (name, partial) {
        if (!partials[name]) partials[name] = partial
      })
    })
    return partials
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
    return loadFile('helpers', name, true)
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
        options.partials[i] = hogan.compile(options.partials[i])
      }
      return hogan.compile(source, options).render(options.locals, options.partials)
    }
  }
}
