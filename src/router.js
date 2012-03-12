function match(app, prefix, method, route, middleware, controllerName, action) {
  action = action || 'index'
  prefix = prefix == 'root' ? '' : '/' + prefix
  route = prefix ? ((route != '/') ? prefix + route : prefix) : route
  var Controller = app.getController(controllerName)
    , filters = []
  if (Controller.beforeFilters['*']) filters = filters.concat(Controller.beforeFilters['*'])
  if (Controller.beforeFilters[action]) filters = filters.concat(Controller.beforeFilters[action])

  if (filters.length) {
    middleware = typeof Controller.excludeFilters[action] === 'undefined' ?
      filters.concat(middleware) :
      v(filters).filter(function (filter) {
        return !v.inArray(Controller.excludeFilters[action], filter)
      }).concat(middleware)
  }

  app[method](route, middleware, function (req, res, next) {
    Controller[action].apply(Controller, [req, res].concat(v(req.params).values().concat(next)))
  })
}

module.exports.init = function (app, routes) {
  v.each(routes, function (key, value) {
    v(value).each(function (tuple) {
      var tupleLen = tuple.length
        , numOptionalArgs = tupleLen - 2
        , trailingArgs = numOptionalArgs && typeof tuple[tupleLen - 1] === 'string' ? tuple.slice(
           numOptionalArgs > 1 && typeof tuple[tupleLen - 2] === 'string' ? -2 : -1
          ) : []
        , middlewareLen = tupleLen - trailingArgs.length - 2
        , middleware = tuple.splice(2, middlewareLen)

      match.apply(null, [app, key, tuple[0], tuple[1], middleware].concat(trailingArgs))
    })
  })
}
