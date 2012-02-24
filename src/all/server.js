var matador = require('matador')
  , env = process.env.NODE_ENV || "development"
  , argv = require('optimist').argv
  , config = require("./config-" + env)
  , app = matador.createApp(
      __dirname
    , config
    , {
          showRoutes:argv.showRoutes
      }
    )
  , port = argv.port || 3000

app.configure(function () {
  io.set('log level', 1)

  app.set('view engine', 'html')
  app.register('.html', matador.engine)

  app.use(matador.cookieParser())
  app.use(matador.session());
  
  app.use(matador.bodyParser())
  app.use(matador.methodOverride())
  
  app.use(matador.static(__dirname + '/public'));
  app.use(require("./compiler")({src:"./public", dest:"./public-compiled", enable:["less","hogan"]}));
  app.use(matador.static(__dirname + "/public-compiled"));
})

app.configure('development', function () {
  app.use(matador.errorHandler({ dumpExceptions: true, showStack: true }))
})

app.configure('production', function () {
  app.use(matador.errorHandler())
})

app.prefetch();
app.mount();
app.listen(port);
console.log('matador running on port ' + port)
