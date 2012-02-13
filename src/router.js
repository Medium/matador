function match(prefix, method, route, middleware, controllerName, action) {
  action = action || 'index'
  prefix = prefix == 'root' ? '' : '/' + prefix
  route = prefix ? ((route != '/') ? prefix + route : prefix) : route
  var controllerFile = app.set('controllers') + prefix + '/' + controllerName + 'Controller'
    , Controller = require(controllerFile)
  app[method](route, middleware, function (req, res, next) {
    var inst = new Controller(req, res, next)
      , beforeFilters = v(inst.beforeFilters).chain()
          .filter(function (f) {
            return !v.find(inst.excludeFilters, function (x) {
              return x.filter == f.filter && action == x.action
            })
          })
          .filter(function (f) {
            return !f.action || f.action == action
          })
          .map(function (f) {
            return function (callback) {
              f.filter.call(inst, callback)
            }
          })
          .value()
    v.waterfall(beforeFilters, function (err, result) {
      if (err) return inst.error(err, v(req.params).values())
      inst[action].apply(inst, v(req.params).values())
    })
  })
}
module.exports.init = function (routes) {
  v.each(routes, function(key, value) {
    v(value).each(function (tuple) {
      var tupleLen = tuple.length
        , numOptionalArgs = tupleLen - 2
        , trailingArgs = numOptionalArgs && typeof tuple[tupleLen-1] === 'string' ? tuple.slice(
           typeof tuple[tupleLen-2] === 'string' ? -2 : -1
          ) : []
        , middlewareLen = tupleLen - trailingArgs.length - 2
        , middleware = tuple.splice(2, middlewareLen)
      
      match.apply(null, [key, tuple[0], tuple[1], middleware].concat(trailingArgs))
    })
  })
}
