var fs = require('fs')
  , CookieService = require('./cookie')
  , connect = module.exports = require('connect')
  , http = require('http')
  , path = require('path')
  , hogan = require('hogan.js')
  , soynode = require('soynode')
  , klass = global.klass = require('klass')
  , v = global.v = require('valentine')
  , router = require('./router')
  , argv = module.exports.argv = require('optimist').argv
  , minifyViews = process.env.minify || false
  , paths = {
      SERVICES: 'services'
    , HELPERS: 'helpers'
    , MODELS: 'models'
    , CONTROLLERS: 'controllers'
  }
  , filenameSuffixes = {
      SERVICES: 'Service'
    , HELPERS: 'Helper'
    , MODELS: 'Model'
    , CONTROLLERS: 'Controller'
  }
  , existsSync = fs.existsSync || path.existsSync

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

/**
 * Check whether a path exists and is a directory
 *
 * @param {string} p the path
 */
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

  var appDir = path.join(baseDir, '/app')
    , fileCache = {}
    , objCache = {}
    , pathCache = {}
    , templateEngines = {}
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
          for (var key in configuration.base) {
            config[key] = configuration.base[key]
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
   * Allow registration of template engines
   */
  app.register = function (suffix, engine) {
    if (typeof engine === 'undefined') {
      engine = suffix
      suffix = '.html'
    }
    templateEngines[suffix] = engine
    return this
  }

  /**
   * Return middleware which will set up a bunch of methods on the request object for convenience
   */
  app.requestDecorator = function () {
    var templateCache = {}

    /**
     * Take in a template name and options and call a callback with a compiler. This is only temporarily
     * as we're changing up our template system to be non-file specific (to allow for engines like
     * soynode)
     *
     * @param {string} templateName
     * @param {Object} options
     * @param {Function} callback
     */
    function getTemplate(templateName, options, callback) {
      // is the template already cached?
      if (templateCache[templateName]) return callback(null, templateCache[templateName])

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
      var engine = templateEngines[suffix]
      if (!engine) return callback(Error("No engine found for template type " + suffix))

      // does the template exist?
      if (!existsSync(templateName)) return callback(new Error("Template '" + templateName + "' does not exist"))

      // read the template in, cache, and call the callback
      fs.readFile(templateName, 'utf8', function (err, data) {
        if (err) return callback(err)
        try {
          templateCache[templateName] = engine.compile(data, options)
        } catch (e) {
          return callback(e)
        }
        return callback(null, templateCache[templateName])
      })
    }

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

      // render a given template to the client
      res.render = function renderResponse(templateName, options, callback) {

        // get the requested template compiler
        getTemplate(templateName, options, function (err, compiler) {
          // no template, exit out
          if (err) {
            console.error(err)
            res.send(err.message)
          }

          // compile the template
          var output = compiler(options)

          // no layout specified, return the compiled template
          if (!options.layout) return callback ? callback(output) : res.send(output)

          // layout was specified, retrieve the layout template
          getTemplate(options.layout, options, function (err, compiler) {
            //no layout template, exit out
            if (err) {
              console.error(err)
              res.send(err.message)
            }

            //set the body in the options to the previous compiled template and compile
            options.body = output
            output = compiler(options)

            //return the compiled template
            callback ? callback(output) : res.send(output)
          })
        })
      }

      next()
    }
  }

  /**
   * Create middleware which will look at where a request is supposed to go and attach
   * relevant target info to the request
   *
   * @returns {Function} middleware
   */
   app.preRouter = function preRouter() {
    return function preRouter (req, res, next) {
      var matcher = app._pathMatchers[req.method === 'HEAD' ? 'GET' : req.method]
      // check for any handler for the http method first
      if (!matcher) return next()

      // try and match
      var handler = matcher.getMatch(req.url.split('?')[0])
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
      if (!req.target) return next(new Error("Handler not found for " + req.url))

      var middleware = target.middleware || config.defaultMiddleware
      if (!middleware) return target.method.call(target.controller, req, res, next)

      // call this function when done with a piece of route middleware
      var doNext = function (idx, err) {
        if (err) return next(err)
        if (idx >= middleware.length) return target.method.call(target.controller, req, res, next)
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
   * create an http server from the app on a given port
   *
   * @param {number} port
   * @returns {Object} app
   */
  app.createServer = function createServer(port) {
    app.use(responseRouter)
    http.createServer(app).listen(port)
    return app
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
          if (isDirectory(d + "/" + file)) return
          if (file.charAt(0) == '.') return
          if (file.substr(file.length - 3) === '.js') file = file.substr(0, file.length - 3)
          loadFile(type, file, dir)
        })
      })
    })

    var soyOptions = app.set('soy options') || {}
    soynode.setOptions(soyOptions)

    // Precompile all Closure templates.
    v.each(appDirs, function (dir) {
      dir = dir + '/views'
      if (!isDirectory(dir)) return

      soynode.compileTemplates(dir, callback || function (err) {
        if (err) {
          throw err
        }
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
