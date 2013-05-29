var fs = require('fs')
  , CookieService = require('./cookie')
  , connect = module.exports = require('connect')
  , http = require('http')
  , path = require('path')
  , router = require('./router')
  , argv = module.exports.argv = require('optimist').argv
  , TemplateEngine = require('./TemplateEngine')
  , fsutils = require('./fsutils')
  , isDirectory = fsutils.isDirectory
  , existsSync = fsutils.existsSync
  , minifyViews = process.env.minify || false

var paths = {
  SERVICES: 'services'
, HELPERS: 'helpers'
, MODELS: 'models'
, CONTROLLERS: 'controllers'
}

var filenameSuffixes = {
  SERVICES: 'Service'
, HELPERS: 'Helper'
, MODELS: 'Model'
, CONTROLLERS: 'Controller'
}

global.klass = require('klass')
global.v = require('valentine')

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

module.exports.createApp = function (baseDir, configuration, options) {
  configuration = configuration || {}
  options = options || {}

  var appDir = path.join(baseDir, '/app')
    , fileCache = {}
    , objCache = {}
    , pathCache = {}
    , updateCaches = v(paths).each(function (key, val) {
        fileCache[val] = {}
        objCache[val] = {}
        pathCache[val] = {}
      })
    , partialCache = {}
    , listingCache = {}
    , appDirs = [appDir].concat(v(function () {
        var dir = appDir + '/modules'
        return existsSync(dir) ? fs.readdirSync(dir) : []
      }()).map(function (dir) {
        return appDir + '/modules/' + dir
      }))
    , app = connect()
    , fileExists = function (filename) {
        // We check for file existence this way so that our lookups are case sensitive regardless of the underlying filesystem.
        var dir = path.dirname(filename)
          , base = path.basename(filename)
        if (!listingCache[dir]) listingCache[dir] = existsSync(dir) ? fs.readdirSync(dir) : []
        return listingCache[dir].indexOf(base) !== -1
      }
    , loadFile = function (subdir, name, p) {
        if (typeof(fileCache[subdir][name]) !== 'undefined') return fileCache[subdir][name]
        var pathname = name.replace(/\./g, '/')
        var dir = v.find((p ? [p] : appDirs), function (dir) {
          var filename = dir + '/' + subdir + '/' + pathname + '.js'
          if (!fileExists(filename)) return false
          try {
            fileCache[subdir][name] = require(filename)(app, getConfig(subdir, name))
            // emit event saying a helper was just created w/ name - Helper
            if (subdir === paths.HELPERS) app.emit('createHelper', name.substr(0, name.length - 6), fileCache[subdir][name])
          } catch (e) {
            console.error('Error loading file:', subdir, name, p, e.stack)
            throw e
          }
          pathCache[subdir][name] = dir === appDir ? [appDir] : [dir, appDir]
          return true
        })
        if (!dir) throw new Error('Unable to find ' + subdir + '/' + pathname)

        return fileCache[subdir][name]
      }
    , loadClass = function (subdir, name, localName, definitionOnly) {
        if (definitionOnly) return loadFile(subdir, name)
        if (!objCache[subdir][name]) {
          var File = loadFile(subdir, name)
          objCache[subdir][name] = new File(localName, pathCache[subdir][name])
          objCache[subdir][name]._paths = pathCache[subdir][name]

          if (subdir === paths.MODELS) app.emit('createModel', localName, objCache[subdir][name])
          else if (subdir === paths.SERVICES) app.emit('createService', localName, objCache[subdir][name])
          else if (subdir === paths.CONTROLLERS) app.emit('createController', localName, objCache[subdir][name])
          // not emitting an event for helpers here as we never actually instantiate a helper
        }
        return objCache[subdir][name]
      }
    , mountPublicDir = function (dir) {
        var directory = dir + '/public'
        fileExists(directory) && app.use(connect.static(directory))
      }

      /**
       * Gets the configuration by type (e.g. Controller, Service, Helper) and name (e.g. ImageService,
       * AuthController, SecurityHelper).  If present, values are taken from the 'base' configuration
       * and then taken from the specific config, thus a specific config can override a base value.
       *
       * A config might look like this:
       *
       * var config = {
       *   base: {baseUrl: '/', name: 'My Project'},
       *   services: {
       *     ImageService: {baseUrl: '//cdn.project.com/'}
       *   },
       *   controllers: {
       *     AuthController: {authType: 'basic-auth'}
       *   }
       * }
       */
    , getConfig = function (type, name) {
        var config = {}
        // Copy values from the base configuration.
        if (configuration.base) {
          for (var baseKey in configuration.base) {
            config[baseKey] = configuration.base[baseKey]
          }
        }
        // Copy configuration keys from the specific config, this will override
        // values in the base configuration.
        if (configuration[type] && configuration[type][name]) {
          for (var key in configuration[type][name]) {
            config[key] = configuration[type][name][key]
          }
        }
        return config
      }


  /**
   * Return middleware which will set up a bunch of methods on the request object for convenience
   */
  app.requestDecorator = function () {
    /**
     * Shim function to emulate express functionality
     */
    return function requestDecorator(req, res, next) {
      // this is stupid
      req.res = res
      req.params = {}
      res.req = req
      req.path = req.url

      // emulate the param function in express by returning a path arg
      req.param = function getRequestParam(key) {
        return req.params[key]
      }

      // map res.header to res.setHeader for convenience
      res.header = res.setHeader

      // cookie service which allows for setting and retrieval of cookies
      var cookieService = new CookieService(req, res)
      res.cookie = cookieService.set.bind(cookieService)

      // expire a given cookie
      res.clearCookie = function clearCookie(key, options) {
        options.expires = 0
        cookieService.set(key, '', options)
      }

      // redirect the current request to a new url
      res.redirect = function redirectRequest(url) {
        res.writeHead(302, {
          'Location': url
        })
        res.end()
      }

      // send output to the request object and close the request
      res.send = function sendResponse(data, headers, status) {
        var bytesWritten

        if (headers) {
          for (var key in headers) res.setHeader(key, headers[key])
        }

        // optional status code
        if (status) res.statusCode = status

        // if no content type was set, assume html
        if (!res.getHeader('content-type')) res.setHeader('content-type', 'text/html; charset=utf-8')
        if (typeof data === 'string') data = new Buffer(data)
        if (data instanceof Buffer) bytesWritten = data.length
        if (!res.getHeader('content-length') && typeof bytesWritten !== 'undefined') res.setHeader('content-length', bytesWritten)

        if (req.method !== 'HEAD') res.write(data)

        // done
        res.end()
        return bytesWritten
      }

      next()
    }
  }

  app.templateEngine = new TemplateEngine()

  /**
   * Create middleware which will look at where a request is supposed to go and attach
   * relevant target info to the request
   *
   * @returns {Function} middleware
   */
  app.preRouter = function preRouter() {
    return function preRouter(req, res, next) {
      var matcher = app._pathMatchers[req.method === 'HEAD' ? 'GET' : req.method]
      // check for any handler for the http method first
      if (!matcher) return next()

      // Strip querystring and fragment.  Fragment should never be seen but we've seen it sent by
      // scrapers and other tools (e.g. Kindle).
      var url = req.url.replace(/[?#].*$/, '')

      // try and match
      var handler = matcher.getMatch(url)
      if (!handler) return next()

      // successful match, attach it to the req obj
      req.target = handler.object
      req.params = {}
      if (handler.matches) {
        for (var key in handler.matches) {
          if (key == '*' && Array.isArray(handler.matches['*'])) {
            // The wildcard param passes an array of path parts.
            req.params['*'] = handler.matches['*'].map(decodeURI)
          } else {
            req.params[key] = decodeURI(handler.matches[key])
          }
        }
      }
      return next()
    }
  }

  /**
   * Create the actual router to route the request to a controller action
   *
   * @param {{defaultMiddleware:{Object|Array.<Object>}}} configuration configuration for
   *     the router. defaultMiddleware will define middleware which will run for any request
   *     as long as the middleware hasn't been defined at the controller or method level
   */
  app.router = function router(config) {
    config = config || {}

    return function router(req, res, next) {
      var target = req.target
      if (!req.target) return next(new Error('Handler not found for ' + req.method + ' ' + req.url))

      var middleware = target.middleware || config.defaultMiddleware
      if (!middleware) return target.method.call(target.controller, req, res, next)

      // call this function when done with a piece of route middleware
      var doNext = function (idx, err) {
        if (err) return next(err)
        if (idx >= middleware.length) {
          if (target.controller) {
            return target.method.call(target.controller, req, res, next)
          } else {
            next()
          }
        }
        middleware[idx].call(null, req, res, doNext.bind(null, idx + 1))
      }

      doNext(0)
    }
  }

  // random arg map for use with app.set()
  app._vars = {}

  /**
   * Allow configuration of this application via the current environment. If env is passed in
   * and the current environment (process.env.NODE_ENV) matches env, then the function is ran.
   * Any functions passed in without an env will be ran regardless.
   *
   * @param {string} env the current environment
   * @param {Function} fn the function to call if the configuration block should be used
   */
  app.configure = function configureApp(env, fn) {
    if (typeof fn === 'undefined') env()
    else if (env === process.env.NODE_ENV) fn()
  }

  /**
   * set/get an arbitrary value on the app object (set if the new value isn't undefined)
   * (Express shim)
   *
   * @param {string} key
   * @param {Object|string|number} value
   * @returns {Object|string|number} current value
   */
  app.set = function (key, val) {
    if (typeof (val) !== 'undefined') app._vars[key] = val
    return app._vars[key]
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

  app.getModulePaths = function () {
    return appDirs
  }

  app.mount = function () {
    var router = require('./router')
      , self = this

    v.each(appDirs, function (dir) {
      var filename = dir + '/config/routes.js'
      if (!fileExists(filename)) return
      try {
        router.init(self, require(filename)(self))
      } catch (e) {
        console.log('Error initializing routes', e.stack)
        throw e
      }
    })
  }

  app.prefetch = function (options, callback) {
    var self = this

    v(paths).each(function (key, type) {
      v.each(appDirs, function (dir) {
        var d = dir + '/' + type
        if (!isDirectory(d)) return
        v.each(fs.readdirSync(d), function (file) {
          if (isDirectory(d + '/' + file)) return
          if (file.charAt(0) == '.') return
          if (file.substr(file.length - 3) === '.js') file = file.substr(0, file.length - 3)
          loadFile(type, file, dir)
        })
      })
    })

    self.templateEngine.precompileTemplates(appDirs, app.set('soy options') || {}, callback)
  }

  /**
   * Get a service instance or class
   *
   * @param {string} name the name of the service
   * @param {Boolean} definitionOnly whether to just grab the class or to grab an actual
   *     instance
   * @return {Object} a service class or instance
   */
  app.getService = function (name, definitionOnly) {
    return loadClass(paths.SERVICES, name + filenameSuffixes.SERVICES, name, definitionOnly)
  }

  /**
   * Get a controller instance or class
   *
   * @param {string} name the name of the controller
   * @param {Boolean} definitionOnly whether to just grab the class or to grab an actual
   *     instance
   * @return {Object} a controller class or instance
   */
  app.getController = function (name, definitionOnly) {
    if (app.controllers[name]) {
      return definitionOnly ? app.controllers[name] : new app.controllers[name](name, [])
    }
    else {
      return loadClass(paths.CONTROLLERS, name + filenameSuffixes.CONTROLLERS, name, definitionOnly)
    }
  }

  /**
   * Get a model instance or class
   *
   * @param {string} name the name of the model
   * @param {Boolean} definitionOnly whether to just grab the class or to grab an actual
   *     instance
   * @return {Object} a model class or instance
   */
  app.getModel = function (name, definitionOnly) {
    return loadClass(paths.MODELS, name + filenameSuffixes.MODELS, name, definitionOnly)
  }

  /**
   * Get a helper
   *
   * @param {string} name of the helper
   * @return {Object} a helper instance
   */
  app.getHelper = function (name) {
    return loadFile(paths.HELPERS, name + filenameSuffixes.HELPERS)
  }

  /**
   * Registers a helper that has been loaded or defined outside the standard folder structure.
   * Can be used with off the shelf matador helpers, e.g:
   *
   * <pre>
   *  app.registerHelper('Cache', matador.helpers.CacheHelper)
   * </pre>
   * @param {function(Application) : Object} helperFactory A factory method that takes the application
   *    and returns a helper object.
   */
  app.registerHelper = function (name, helperFactory) {
    fileCache[paths.HELPERS][name + filenameSuffixes.HELPERS] = helperFactory(app)
  }

  /**
   * Override the existing cached version of a service
   *
   * @param {string} name the name of the service
   * @param {Object} instance the service instance
   */
  app.setService = function (name, instance) {
    objCache[paths.SERVICES][name + filenameSuffixes.SERVICES] = instance
  }

  /**
   * Override the existing cached version of a controller
   *
   * @param {string} name the name of the controller
   * @param {Object} instance the controller instance
   */
  app.setController = function (name, instance) {
    objCache[paths.CONTROLLERS][name + filenameSuffixes.CONTROLLERS] = instance
  }

  /**
   * Override the existing cached version of a model
   *
   * @param {string} name the name of the model
   * @param {Object} instance the model instance
   */
  app.setModel = function (name, instance) {
    objCache[paths.MODELS][name + filenameSuffixes.MODELS] = instance
  }

  app.controllers.Static = require('./StaticController')(app)

  return app
}

/**
 * A selection of off the shelf-helper classes that can be installed by an
 * application using `app.registerHelper(name, helper)`. e.g:
 *
 * <pre>
 *   app.registerHelper('Cache', matador.helpers.CacheHelper)
 * </pre>
 */
module.exports.helpers = {
  get CacheHelper() { return require('./helpers/CacheHelper') }
}
