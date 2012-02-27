var fs = require('fs')
  , express = module.exports = require('express')
  , path = require('path')
  , hogan = require('hogan.js')
  , klass = global.klass = require('klass')
  , v = global.v = require('valentine')
  , router = require('./router')
  , argv = module.exports.argv = require('optimist').argv

module.exports.createApp = function (baseDir, configuration, options) {
  configuration = configuration || {}
  options = options || {}

  var appDir = baseDir + "/app"
    , fileCache = {'services': {}, 'helpers': {}, 'models': {}, 'controllers': {}}
    , objCache = {'services': {}, 'helpers': {}, 'models': {}, 'controllers': {}}
    , pathCache = {'services': {}, 'helpers': {}, 'models': {}, 'controllers': {}}
    , partialCache = {}
    , appDirs = [appDir].concat(v(function () {
        var dir = appDir + '/modules'
        return path.existsSync(dir) ? fs.readdirSync(dir) : []
      }()).map(function (dir) {
        return appDir + "/modules/" + dir
      }))
    , app = express.createServer()
    , loadFile = function (subdir, name, path) {
        if (typeof(fileCache[subdir][name]) !== 'undefined') return fileCache[subdir][name]

        var dir = v.find((path ? [path] : appDirs), function (dir) {
          var filename = dir + '/' + subdir + '/' + name + '.js'
          try {
            fs.statSync(filename)
          }
          catch (e) {
            return false
          }
          fileCache[subdir][name] = require(filename)(app, (configuration[subdir] && configuration[subdir][name] ? configuration[subdir][name] : {}))
          pathCache[subdir][name] = dir === appDir ? [appDir] : [dir, appDir]
          return true
        })
        if (!dir) throw new Error("Unable to find " + subdir + "/" + name)

        return fileCache[subdir][name]
      }
    , loadClass = function (subdir, name, definitionOnly) {
        if (definitionOnly) return loadFile(subdir, name)
        if (!objCache[subdir][name]) {
          var File = loadFile(subdir, name)
          objCache[subdir][name] = new File()
          objCache[subdir][name]._paths = pathCache[subdir][name]
        }
        return objCache[subdir][name]
      }

  app.set('base_dir', appDir)

  v(appDirs).each(function (dir) {
    // this is a no.... must re-do
    var directory = dir + '/public'
    app.set('public', directory)
    path.existsSync(directory) && app.use(express.static(directory))
  })

  app.controllers = {
    Base: require('./BaseController')(app)
  }

  app.mount = function () {
    var router = require('./router')
      , self = this

    v.each(appDirs, function (dir) {
      var filename = dir + '/config/routes.js'
      try {
        fs.statSync(filename)
      }
      catch (e) {
        return
      }
      try {
        router.init(self, require(filename)(self))
      }
      catch (e) {
        console.log(e.stack)
      }
    })
  }

  app.prefetch = function (options) {
    var self = this

    v.each(["helpers", "models", "services", "controllers"], function (type) {
      v.each(appDirs, function (dir) {
        try {
          v.each(fs.readdirSync(dir + "/" + type), function (file) {
            if (file.substr(file.length - 3) === '.js') file = file.substr(0, file.length - 3)
            loadFile(type, file, dir)
          })
        }
        catch (e) {}
      })
    })
  }

  app.getPartials = function (paths) {
    var partials = {}
      , objs = v.map(paths, function (path) {
        if (!partialCache[path]) {
          var viewSuffix = '.' + app.set('view engine')
            , viewsRoot = path + "/views"
            , pathPartials = {}
            , dirs = [viewsRoot]

          while (dirs.length) {
            var dir = dirs.shift()

            try {
              v.each(fs.readdirSync(dir), function (file) {
                var fullPath = dir + "/" + file
                  , stat = fs.statSync(fullPath)
                  , localDir = dir.substr(viewsRoot.length + 1)

                if (!stat.isDirectory()) return
                if (file !== "partials") return dirs.push(fullPath)

                v.each(fs.readdirSync(fullPath), function (partial) {
                  var viewFile = localDir
                    + (localDir.length ? "/" : "")
                    + partial.substr(0, partial.length - viewSuffix.length)
                    , partialContent = fs.readFileSync(fullPath + "/" + partial, 'utf8')

                  pathPartials[viewFile] = hogan.compile(partialContent)
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
    return loadClass("services", name + "Service", definitionOnly)
  }

  app.getController = function (name, definitionOnly) {
    if (app.controllers[name]) {
      return definitionOnly ? app.controllers[name] : new app.controllers[name]()
    }
    else {
      return loadClass('controllers', name + "Controller", definitionOnly)
    }
  }

  app.getModel = function (name, definitionOnly) {
    return loadClass("models", name + "Model", definitionOnly)
  }

  app.getHelper = function (name) {
    return loadFile('helpers', name, true)
  }

  app.controllers.Static = require('./StaticController')(app)

  return app
}

module.exports.engine = {
  compile: function (source, options) {
    if (typeof source != 'string') return source
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