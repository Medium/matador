var PathMatcher = require('./pathMatcher')

/**
 * Adds routing data to the application and emits a new event
 */
function _addRouteData(app, method, path, routeData) {
  app._pathMatchers[method.toUpperCase()].add(path, routeData)
  app.emit('createRoute', method.toUpperCase(), path, routeData)
}

/**
 * Creates a routing middleware for a specific controller method
 */
function _addControllerRoutes(app, path, handler, method) {
  var controllerName = handler.split(/\./)[0]
  var actionName = handler.split(/\./)[1]
  var controller = app.getController(controllerName)
  var controllerClass = app.getController(controllerName, true)
  var controllerMethod = controller[actionName]

  if (!controller) throw new Error('Couldn\'t find a controller named ' + controllerName)
  if (!controllerMethod) throw new Error('Couldn\'t find an action called ' + controllerName + '.' + actionName)

  var middleware = controller[actionName].middleware
  var filters = []

  if (controller.beforeFilters['*']) filters = filters.concat(controller.beforeFilters['*'])
  if (controller.beforeFilters[actionName]) filters = filters.concat(controller.beforeFilters[actionName])

  if (filters.length) {
    middleware = typeof middleware === 'undefined' ? [] : middleware;
    middleware = filters.concat(middleware)
  }

  if (!middleware) middleware = controllerClass.defaultMiddleware
  if (middleware) middleware = v(Array.isArray(middleware) ? middleware : [middleware]).flatten()

  //create individual entries for each request method (patchmatching is method-specific)
  var routeData = {
    controller: controller,
    controllerName: controllerName,
    controllerClass: controllerClass,
    method: controllerMethod,
    methodName: actionName,
    middleware: middleware
  }

  _addRouteData(app, method, path, routeData)
}

module.exports.init = function (app, routes) {
  //set up
  if (!app._routes) {
    app._pathMatchers = {
      'DELETE': new PathMatcher(),
      'GET': new PathMatcher(),
      'PUT': new PathMatcher(),
      'POST': new PathMatcher(),
      'PATCH': new PathMatcher()
    }
  }

  //loop through all of the paths and set up middleware as well as handlers
  for (var path in routes) {
    var handlers = routes[path]

    //if the handler is a string, use it for delete, get, put, and post
    if (typeof handlers === 'string' || typeof handlers === 'function') {
      handlers = {
        'DELETE': handlers,
        'GET': handlers,
        'PUT': handlers,
        'POST': handlers,
        'PATCH': handlers
      }
    }

    //for each of the handler methods, figure out which middleware to use
    for (var method in handlers) {
      if (typeof handlers[method] === 'string') {
        _addControllerRoutes(app, path, handlers[method], method)
      } else if (typeof handlers[method] === 'function') {
        _addRouteData(app, method, path, {
          middleware: [handlers[method]]
        })
      }
    }
  }
}
