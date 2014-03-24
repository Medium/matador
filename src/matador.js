var fs = require('fs')
  , CookieService = require('./cookie')
  , connect = require('connect')
  , http = require('http')
  , path = require('path')
  , router = require('./router')
  , TemplateEngine = require('./TemplateEngine')
  , fsutils = require('./fsutils')
  , CacheHelper = require('./helpers/CacheHelper')
  , FileLoader = require('./FileLoader')
  , ClassLoader = require('./ClassLoader')
  , PathMatcher = require('./pathMatcher')
  , RequestMessage = require('./RequestMessage')
  , isDirectory = fsutils.isDirectory

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

/**
 * Get current environment (NODE_ENV environment variable),
 * falling back to 'development' if it is not set.
 * @return {string} The current environment
 */
var getEnv = function () {
  return process.env.NODE_ENV || 'development'
}

/**
 * There are two ways to organize your config object.
 *
 * If config.flatConfig is falsey, then the config should look like this:
 * var config = {
 *   base: {baseUrl: '/', name: 'My Project'},
 *   services: {
 *     ImageService: {baseUrl: '//cdn.project.com/'}
 *   },
 *   controllers: {
 *     AuthController: {authType: 'basic-auth'}
 *   }
 * }
 *
 * When we instantiate AuthController, we will pass it a config like this:
 * {baseUrl: '/', name: 'My Project', authType: 'basic-auth'}
 *
 * If config.flatConfig is truthy, then the config is just passed to each
 * service without modification. In a flat config, the 'base' key is forbidden.
 */
function validateConfig(config) {
  if (config.flatConfig) {
    if ('base' in config) throw new Error('Malformed config: "base" not allowed in a flag config')
  }}

/**
 * Create a new app.
 * @param {string} baseDir The base directory of the server.
 * @param {Object} configuration A config object, to be passed to each service.
 */
var createApp = function (baseDir, configuration) {
  configuration = configuration || {}
  validateConfig(configuration)

  var appDir = path.join(baseDir, '/app')
    , objCache = {}
    , customHelpers = {}
    , app = connect()
    , fileLoader = new FileLoader(app, appDir, paths)
    , classLoader = new ClassLoader(fileLoader)
    , mountPublicDir = function (dir) {
        var directory = dir + '/public'
        fileLoader.fileExists(directory) && app.use(connect.static(directory, configuration.publicStaticOptions))
      }

  /**
   * Gets the configuration by type (e.g. Controller, Service, Helper) and name (e.g. ImageService,
   * AuthController, SecurityHelper).
   *
   * @see validateConfig for the config format.
   */
  app.getConfig = function (type, name) {
    // If the configuration is flat, don't build use keys.
    if (configuration.flatConfig) return configuration

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
      var cookieService = new CookieService(req, res, app.get('force_secure_cookies', false))
      res.cookie = cookieService.set.bind(cookieService)

      // expire a given cookie
      res.clearCookie = function clearCookie(key, options) {
        options.maxAge = -1000
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
            return next()
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
   * and the current environment matches env, then the function is ran.
   * Any functions passed in without an env will be ran regardless.
   *
   * @param {string} env the current environment
   * @param {Function} fn the function to call if the configuration block should be used
   */
  app.configure = function configureApp(env, fn) {
    if (typeof fn === 'undefined') env()
    else if (env === getEnv()) fn()
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

  /**
   * Get a value on the app object.
   * @param {string} key
   * @param {*=} defaultVal A default value if the key doesn't exist.
   *     If we pass 'undefined', and the key isn't set, then we throw an error.
   * @return {*} The current value.
   */
  app.get = function (key, defaultVal) {
    if (key in app._vars) {
      return app._vars[key]
    }

    if (typeof defaultVal === 'undefined') {
      throw new Error('Missing key: ' + key)
    } else {
      return defaultVal
    }
  }

  app.set('base_dir', appDir)
  app.set('public', appDir + '/public')

  app.controllers = {
    Base: require('./BaseController')(app)
  }

  /**
   * Add routes for all the /public app directories. This will be called on
   * boot(). If you don't call boot, it should be called manually.
   */
  app.addPublicStaticRoutes = function () {
    fileLoader.appDirs.forEach(mountPublicDir)
  }

  app.addModulePath = function (dir) {
    fileLoader.appDirs.push(dir)
    mountPublicDir(dir)
  }

  app.getModulePaths = function () {
    return fileLoader.appDirs
  }


  app.mount = function () {
    var router = require('./router')
      , self = this

    fileLoader.appDirs.forEach(function (dir) {
      var filename = dir + '/config/routes.js'
      if (!fileLoader.fileExists(filename)) return
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
      fileLoader.appDirs.forEach(function (dir) {
        var d = dir + '/' + type
        if (!isDirectory(d)) return
        v.each(fs.readdirSync(d), function (file) {
          if (isDirectory(d + '/' + file)) return
          if (file.charAt(0) == '.') return
          if (file.substr(file.length - 3) === '.js') file = file.substr(0, file.length - 3)
          fileLoader.loadFile(type, file, dir)
        })
      })
    })

    self.templateEngine.precompileTemplates(fileLoader.appDirs, app.set('soy options') || {}, callback)
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
    return classLoader.loadClass(paths.SERVICES, name + filenameSuffixes.SERVICES, name, definitionOnly)
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
      return classLoader.loadClass(paths.CONTROLLERS, name + filenameSuffixes.CONTROLLERS, name, definitionOnly)
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
    return classLoader.loadClass(paths.MODELS, name + filenameSuffixes.MODELS, name, definitionOnly)
  }

  /**
   * Get a helper
   *
   * @param {string} name of the helper
   * @return {Object} a helper instance
   */
  app.getHelper = function (name) {
    if (customHelpers[name]) {
      return customHelpers[name]
    } else {
      return fileLoader.loadFile(paths.HELPERS, name + filenameSuffixes.HELPERS)
    }
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
    customHelpers[name] = helperFactory(app)
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

  /**
   * Middleware that calls a request logger every request. Useful
   * for displaying basic data about a request.
   */
  app.requestLogger = function (requestMessage, logger) {
    return function (req, res, next) {
      requestMessage.requestStart()

      var end = res.end
      res.end = function (chunk, encoding) {
        end.call(res, chunk, encoding)
        requestMessage.requestEnd()

        if (!/\.(jpg|png|less|js|soy|otf|ico)$/.test(req.originalUrl) && !/plovr\/proxy/.test(req.originalUrl)) {
          logger.info(requestMessage.buildMessage(req, res))
        }
      }
      next()
    }
  }

  /**
   * Builds a request logger for development purposes: it logs predefined
   * data onto the console.
   */
  app.developmentRequestLogger = function () {
    return function (req, res, next) {
      var message = RequestMessage.buildDefaultMessage()
      app.requestLogger(message, console)(req, res, next)
    }
  }

  app.boot = function () {
    app.addPublicStaticRoutes()

    // Register the matador cache helper.
    app.registerHelper('Cache', CacheHelper)

    // Use the cache helper's no-cache middleware.
    app.use(app.getHelper('Cache').auditHeadersMiddleware)
    app.use(app.getHelper('Cache').noCacheMiddleware)

    app.use(connect.query())
    app.use(connect.cookieParser())

    app.use(app.requestDecorator())
    app.use(app.preRouter())

    app.use(connect.bodyParser())

    app.configure('development', function () {
      app.use(app.developmentRequestLogger())
      app.use(connect.errorHandler({ dumpExceptions: true, showStack: true }))
      app.set('soy options', {
        eraseTemporaryFiles: true,
        allowDynamicRecompile: true
      })
    })

    app.configure('production', function () {
      app.use(connect.errorHandler())
    })

    app.emit('afterBoot')

    app.use(app.router({}))
    app.prefetch()
    app.mount()
  }

  /**
   * Warn old apps that registering new template handlers is not supported
   * for now
   */
  app.register = function () {
    console.log('DEPRECATION WARNING: Only SoyNode templates are now supported')
  }

  app.controllers.Static = require('./StaticController')(app)

  return app
}

/**
 * Our exports extend connect in-place. This is total fubar
 */
module.exports = connect

/** Get the development vs. prod environment. */
module.exports.getEnv = getEnv

/**
 * Create a new app.
 * @param {string} baseDir The base directory of the server.
 * @param {Object} config A config object, to be passed to each service.
 */
module.exports.createApp = createApp

/** Export Matador's path matcher for potential client-side use */
module.exports.PathMatcher = PathMatcher

/**
 * @return Matador's instance of soynode.
 * Due to the way soynode uses global state, it may be important
 * for Matador and your app to use the same version.
 */
module.exports.getSoynode = function () {
  return require('soynode')
}

module.exports.helpers = {
  /**
   * DEPRECATED: Old apps may still load CacheHelper manually.
   *
   * A selection of off the shelf-helper classes that can be installed by an
   * application using `app.registerHelper(name, helper)`. e.g:
   *
   * <pre>
   *   app.registerHelper('Cache', matador.helpers.CacheHelper)
   * </pre>
   */
  get CacheHelper() { return require('./helpers/CacheHelper') }
}
