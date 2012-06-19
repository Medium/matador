var pathMatcher = require('./pathMatcher')

module.exports.init = function (app, routes) {
  //set up
  if (!app._routes) {
    app._pathMatchers = {
        'DELETE': new pathMatcher()
      , 'GET': new pathMatcher()
      , 'PUT': new pathMatcher()
      , 'POST': new pathMatcher()
    }
  }

  //loop through all of the paths and set up middleware as well as handlers
  for (var path in routes) {
    var handlers = routes[path]

    //if the handler is a string, use it for delete, get, put, and post
    if (typeof handlers === 'string') {
      handlers = {
          'DELETE': handlers
        , 'GET': handlers
        , 'PUT': handlers
        , 'POST': handlers
      }
    }

    //for each of the handler methods, figure out which middleware to use
    for (var method in handlers) {

      var controllerName = handlers[method].split(/\./)[0]
      var actionName = handlers[method].split(/\./)[1]
      var controller = app.getController(controllerName)
      var controllerMethod = controller[actionName]
      var middleware = app.getController(controllerName, true).prototype[actionName].middleware
      if (!middleware) middleware = app.getController(controllerName, true).defaultMiddleware
      if (middleware) middleware = v(Array.isArray(middleware) ? middleware : [middleware]).flatten()

      //create individual entries for each request method (patchmatching is method-specific)
      app._pathMatchers[method.toUpperCase()].add(path, {controller: controller, method: controllerMethod, middleware: middleware})
    }
  }
}

