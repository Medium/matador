function match(prefix, method, route, controllerName, action) {
  action = action || 'index'
  prefix = prefix == 'root' ? '' : '/' + prefix
  route = prefix ? ((route != '/') ? prefix + route : prefix) : route
  var controllerFile = app.set('controllers') + prefix + '/' + controllerName + 'Controller'
    , Controller = require(controllerFile)
  app[method](route, function (req, res) {
    var inst = new Controller(req, res)
      , beforeFilters = v(inst.filters).chain()
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
      tuple.unshift(key)
      match.apply(null, tuple)
    })
  })
}