var fs = require('fs')
var connect = require('connect')
var http = require('http')
var path = require('path')

var CookieService = require('./cookie')
var router = require('./router')
var TemplateEngine = require('./TemplateEngine')
var fsutils = require('./fsutils')
var CacheHelper = require('./helpers/CacheHelper')
var FileLoader = require('./FileLoader')
var ClassLoader = require('./ClassLoader')
var PathMatcher = require('./pathMatcher')
var RequestMessage = require('./RequestMessage')


var paths = {
  SERVICES: 'services',
  HELPERS: 'helpers',
  MODELS: 'models',
  CONTROLLERS: 'controllers'
}


var filenameSuffixes = {
  SERVICES: 'Service',
  HELPERS: 'Helper',
  MODELS: 'Model',
  CONTROLLERS: 'Controller'
}


/**
 * Creates a new connect app modified with matador functionality.
 * @param {string} baseDir The base directory of the server.
 * @param {Object} configuration A config object, to be passed to each service.
 */
var createApp = function (baseDir, configuration) {
  configuration = configuration || {}
  validateConfig(configuration)

  // A matador app is an instance of connect with bolted on behavior.
  var app = connect()

  var appDir = path.join(baseDir, '/app')
  var objCache = {}
  var customHelpers = {}
  var fileLoader = new FileLoader(app, appDir, paths)
  var classLoader = new ClassLoader(fileLoader)

  app.templateEngine = new TemplateEngine()

  // random arg map for use with app.set()
  app._vars = {}

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
   * Allow configuration of this application via the current environment. If env is passed in
   * and the current environment matches env, then the function is ran.
   * Any functions passed in without an env will be ran regardless.
   *
   * @param {string} env the current environment
   * @param {Function} fn the function to call if the configuration block should be used
   * @deprecated In practice this method is confusing.
   */
  app.configure = function (env, fn) {
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

  /**
   * Add routes for all the /public app directories. If you don't call
   * `useCommonMiddleware()`, it should be called manually.
   */
  app.addPublicStaticRoutes = function () {
    fileLoader.appDirs.forEach(function (dir) {
      var directory = dir + '/public'
      if (fileLoader.fileExists(directory)) {
        app.use(connect.static(directory, configuration.publicStaticOptions))
      }
    })
  }

  /**
   * Get a service instance or class
   *
   * @param {string} name the name of the service
   * @param {Boolean} definitionOnly whether to just grab the class or to grab an actual
   *     instance
   * @return {Object} a service class or instance
   * @deprecated: Lets remove this.
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
   * @deprecated: Lets remove this.
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
   * @deprecated: Lets remove this.
   */
  app.setModel = function (name, instance) {
    objCache[paths.MODELS][name + filenameSuffixes.MODELS] = instance
  }

  /**
   * Adds connect middleware that are required for typical operation.  Most
   * applications should call this before `start()`.
   */
  app.useCommonMiddleware = function () {
    app.addPublicStaticRoutes()

    // Register the matador cache helper and middleware for auditing cache headers.
    app.registerHelper('Cache', CacheHelper)
    app.use(app.getHelper('Cache').auditHeadersMiddleware)

    app.use(requestDecorator.bind(null, app)) // error handler
    app.use(requestDecorator.bind(null, app, undefined)) // normal handler
    app.use(connect.query())

    // stupid body parser is stupid (doesn't check for http method in current
    // connect version, manually create body parser from the 3 child methods)
    var jsonParser = connect.json(app.get('configMiddlewareJson', {limit: '10mb'}))
    app.use(function (req, res, next) {
      req.body = {}
      if (req.method == 'GET' || req.method == 'HEAD') return next()
      return jsonParser(req, res, next)
    })
    app.use(connect.urlencoded(app.get('configMiddlewareUrlEncoded', {limit: '10mb'})))
    app.use(connect.multipart(app.get('configMiddlewareMultipart', null)))

    app.use(preRouter.bind(null, app))

    app.use(connect.query())
    app.use(connect.cookieParser())

    app.emit('afterBoot') // Deprecated.
  }

  /**
   * Performs final steps before a server will run, no standard middleware can
   * be added after this.
   * @param {Function} callback for when templates have loaded.
   */
  app.start = function (callback) {
    // Add the connect middleware that will actually execute the router.
    app.use(callRouter)

    // Set up the router to listen on for routes.
    fileLoader.appDirs.forEach(function (dir) {
      var filename = dir + '/config/routes.js'
      if (!fileLoader.fileExists(filename)) return
      try {
        router.init(app, require(filename)(app))
      } catch (e) {
        console.error('Error initializing routes', e.stack)
        throw e
      }
    })

    // Load and precompile all the templates.
    for (var key in paths) {
      var type = paths[key]
      fileLoader.appDirs.forEach(function (dir) {
        var d = dir + '/' + type
        if (!fsutils.isDirectory(d)) return
        fs.readdirSync(d).forEach(function (file) {
          if (fsutils.isDirectory(d + '/' + file)) return
          if (file.charAt(0) == '.') return
          if (file.substr(file.length - 3) === '.js') file = file.substr(0, file.length - 3)
          fileLoader.loadFile(type, file, dir)
        })
      })
    }
    app.templateEngine.precompileTemplates(fileLoader.appDirs, app.set('soy options') || {}, callback)
  }

  /**
   * Adds basic error handling that is useful for debugging.
   */
  app.useDevErrorHandler = function () {
    app.use(app.developmentRequestLogger())
    app.use(connect.errorHandler({ dumpExceptions: true, showStack: true }))
    app.set('soy options', {
      eraseTemporaryFiles: true,
      allowDynamicRecompile: true
    })
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

  app.set('base_dir', appDir)
  app.set('public', appDir + '/public')

  app.controllers = {}
  app.controllers.Base = require('./BaseController')(app),
  app.controllers.Static = require('./StaticController')(app)

  return app
}


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
 * Due to the way soynode uses global state, it may be important
 * for Matador and your app to use the same version.
 * @return Matador's instance of soynode.
 */
module.exports.getSoynode = function () {
  return require('soynode')
}


/**
 * Shim function to emulate express functionality.
 *
 * Installed as both an error and regular middleware.
 */
function requestDecorator(app, err, req, res, next) {
  // Cookie service which allows for setting and retrieval of cookies
  var cookieService = new CookieService(req, res, app.get('force_secure_cookies', false))
  res.cookie = cookieService.set.bind(cookieService)

  // Add a method that makes it easy to expire a given cookie.
  res.clearCookie = function clearCookie(key, options) {
    options.maxAge = -1000
    cookieService.set(key, '', options)
  }

  // Add a method to redirect the response to a new url.
  res.redirect = function redirectRequest(url) {
    res.writeHead(302, {'Location': url})
    res.end()
  }

  // Add a method to permanently redirect the response to a new url.
  res.redirectPermanent = function redirectRequestPermanent(url) {
    res.writeHead(301, {'Location': url})
    res.end()
  }

  // Add a method for sending output to the response. Defaults to HTML.
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

  next(err)
}


/**
 * Middleware which will look at where a request is supposed to go and attach
 * relevant target info to the request
 */
function preRouter(app, req, res, next) {
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


/**
 * Middleware that actually routes the request to a controller action
 */
function callRouter(req, res, next) {
  var target = req.target
  if (target && target.controller) return target.method.call(target.controller, req, res, next)
  else return next(new Error('Handler not found for ' + req.method + ' ' + req.url))
}


/**
 * Get current environment (NODE_ENV environment variable), falling back to
 * 'development' if it is not set.
 */
function getEnv() {
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
  }
}
