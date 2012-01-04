# Matador
An MVC framework for Node built on [Express](http://expressjs.com) and [Klass](https://github.com/ded/klass).

## Install Matador binary
    $ npm install matador -g

## Create an app
    $ matador my-app
    $ cd !$ && npm install matador

## Start your app
    $ cd my-app && node server.js


## Build on your app

``` js
// app/config/routes.js
['get', '/', 'Home', 'hello/:name']

// app/controllers/HomeController.js
hello: function (name) {
  this.response.send('hello' + name)
}
```

## View Rendering
Uses Twitters [Hogan.js](http://twitter.github.com/hogan.js/) with layouts, partials, and i18n support.

``` js
// app/controllers/HomeController.js
this.response.render('index', {
  title: 'Hello Bull Fighters'
})
```

``` html
<!-- app/views/layout.html -->
<!DOCTYPE html>
<html>
  <head>
    <meta http-equiv="Content-type" content="text/html; charset=utf-8">
    <title>{{title}}</title>
  </head>
  <body>
    {{{body}}}
  </body>
</html>
```

``` html
<!-- app/views/index.html -->
<h1>{{title}}</h1>
```

## Request Filtering
``` js
// app/controllers/ApplicationController.js
module.exports = require('./BaseController').extend(function () {
  this.addBeforeFilter(this.requireAuth)
  this.addExcludeFilter(['welcome'], this.requireAuth)
})
  .methods({
    requireAuth: function (callback) {
      if (this.request.cookies.authed) return callback(null)
      this.response.redirect('/welcome')
    }
  , welcome: function () {
      this.render('welcome')
    }
  })
```

# Authors

Obviously, [Dustin Senos](https://github.com/dustinsenos) & [Dustin Diaz](https://github.com/ded)

# License

Copyright 2012 Obvious Corporation

Licensed under the Apache License, Version 2.0: http://www.apache.org/licenses/LICENSE-2.0