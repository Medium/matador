var matador = require('matador'),
  cluster = require('cluster'),
  http = require('http'),
  numCPUs = require('os').cpus().length,

  // Command line arguments
  args = {}

process.argv.forEach(function(val, index, array) {
  if (val.indexOf('=') !== -1) {
    var parts = val.split('=')
    args[parts[0]] = parts[1]
  }
})

// Default threads to max possible
args.threads = args.threads || numCPUs

// Listen on multiple threads
if (cluster.isMaster) {
  // Fork workers.
  for (var i = 0; i < args.threads; i++) {
    cluster.fork()
  }

  cluster.on('death', function(worker) {
    console.log('worker ' + worker.pid + ' died')
  })
} else {
  app.configure(function () {
    app.set('models', __dirname + '/app/models')
    app.set('helpers', __dirname + '/app/helpers')
    app.set('views', __dirname + '/app/views')
    app.set('controllers', __dirname + '/app/controllers')
  
    app.set('view engine', 'html')
    app.register('.html', matador.engine)

    app.use(matador.cookieParser())
    app.use(matador.bodyParser())
    app.use(matador.methodOverride())
    app.use(matador.static(__dirname + '/public'))
  })

  app.configure('development', function () {
    app.use(matador.errorHandler({ dumpExceptions: true, showStack: true }))
  })

  app.configure('production', function () {
    app.use(matador.errorHandler())
  })
  app.set('viewPartials', matador.partials.build(app.set('views')))
  matador.mount(require('./app/config/routes'))
  app.listen(3000)
  console.log('matador running on port 3000')
}