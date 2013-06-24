# Matador
Sane defaults and a simple structure, scaling as your application grows.

Matador is a clean, organized framework for [Node.js](http://nodejs.org) architected to suit MVC enthusiasts. It gives you a well-defined development environment with flexible routing, easy controller mappings, and basic request filtering.
It&#8217;s built on open source libraries such as [SoyNode](https://github.com/Obvious/soynode) for view rendering, [Klass](https://github.com/ded/klass) for its inheritance model, [Valentine](https://github.com/ded/valentine)
for functional development, and [Express](http://expressjs.com) to give a bundle of other Node server related helpers.

# Installation
### Get the CLI
    $ npm install matador -g

### Create an app
    $ matador init my-app
    $ cd my-app && npm install matador

### Start your app
    $ node server.js

# Dancing with the Bulls
### Build on your app

``` js
// app/config/routes.js
'/hello/:name': { 'get': 'Home.hello' }

// app/controllers/HomeController.js
hello: function (request, response, name) {
  response.send('hello ' + name)
}
```

### View Rendering
Uses [SoyNode](https://github.com/Obvious/soynode) to render Closure Templates.

``` js
// app/controllers/HomeController.js
this.render(response, 'index', {
  title: 'Hello Bull Fighters'
})
```

```
<!-- app/views/layout.soy -->

{namespace views.layout}

/**
 * Renders the index page.
 * @param title Title of the page.
 */
{template .layout autoescape="contextual"}
  <!DOCTYPE html>
  <html>
    <head>
      <meta http-equiv='Content-type' content='text/html; charset=utf-8'>
      <title>{$title}</title>
      <link rel='stylesheet' href='/css/main.css' type='text/css'>
    </head>
    <body>
      {$ij.bodyHtml |noAutoescape}
    </body>
  </html>
{/template}

```

``` html
{namespace views.index}

/**
 * Renders a welcome message.
 * @param title Title of the page
 */
{template .welcome}
  <h1>Welcome to {$title}</h1>
  (rendered with Closure Templates)
{/template}

```

### Request Filtering
``` js
// app/controllers/ApplicationController.js
module.exports = function (app, config) {
  return app.controllers.Base.extend(function () {
    this.addBeforeFilter('private', this.requireAuth)
  })
  .methods({
    requireAuth: function (callback) {
      if (this.request.cookies.authed) return callback(null)
      this.response.redirect('/welcome')
    }
  , private: function () {
      this.end('This is private')
    }
  , welcome: function () {
      this.render('welcome')
    }
  })
}
```

### Routing
The `app/config/routes.js` file is where you specify an array of tuples indicating where incoming requests will map to a `controller` and the appropriate method. If no action is specified, it defaults to 'index' as illustrated below:

``` js
module.exports = function (app) {
  return {
    '/': 'Home' // maps to ./HomeController.js => index
  , '/admin': 'Admin.show' // maps to ./admin/AdminController.js => show
  }
}
```

You can also specify method names to routes:

``` js
module.exports = function (app) {
  return {
    '/posts': {
      'get': 'Posts.index', // maps to PostsController.js => #index
      'post': 'Posts.create' // maps to PostsController.js => #create
    }
  }
}
```

Matador has support for anonymous controllers or other endpoints. This is
useful when mounting third-party apps, such as [Passport.js](http://passportjs.org):
``` js
module.exports = function (app) {
  return {
    '/hello': function (req, res) {
       res.send('Hello')
     }
  }
}
```

### How can I organize my Models?
By default, Models are thin with just a Base and Application Model in place. You can give them some meat, for example, and embed [Mongo](http://mongoosejs.com) Schemas. See the following as a brief illustration:

``` js
// app/models/ApplicationModel.js
module.exports = function (app, config) {
  return app.getModel('Base', true).extend(function () {
    this.mongo = require('mongodb')
    this.mongoose = require('mongoose')
    this.Schema = this.mongoose.Schema
    this.mongoose.connect('mongodb://localhost/myapp')
  })
}
```

Then create, for example, a UserModel.js that extended it...

``` js
module.exports = function (app, config) {
  return app.getModel('Application', true).extend(function () {
    this.DBModel = this.mongoose.model('User', new this.Schema({
        name: { type: String, required: true, trim: true }
      , email: { type: String, required: true, lowercase: true, trim: true }
    }))
  })
  .methods({
    create: function (name, email, callback) {
      var user = new this.DBModel({
          name: name
        , email: email
      })
      user.save(callback)
    }
  , find: function (id, callback) {
      this.DBModel.findById(id, callback)
    }
  })
}
```

This provides a proper abstraction between controller logic and how your models interact with a database then return data back to controllers.

Take special note that models do not have access to requests or responses, as they rightfully shouldn't.

### Model & Controller Inheritance
The inheritance model Matador uses is built with [Klass](https://github.com/ded/klass), and is exposed via a global `Class` variable (not all globals are bad). Class comes in two flavors where by constructors can be set via an `initialize` method, or a function reference, and by default (in the scaffold), Matador uses the function reference style so that you may benefit from the auto-initialization of super classes, and there is no need to call `this.supr()` in your constructors.

It is also possible to use Node.js's own inheritance via the 'util' module.

### Valentine
The Valentine module is included as a simple tool giving you type checking, functional iterators, and some other nice utilities that often get used in applications of any size. It is exposed globally as `v`. It is used liberally in the Matador router, thus feel free to take advantage of its existence as well.

# Scaffolding

    $ matador controller [name]
    $ matador model [name]

# Contributing & Development

Questions, pull requests, bug reports are all welcome. Submit them here on Github.
When submitting pull requests, please run through the linter to conform to the framework style

    $ npm install -d
    $ npm run-script lint

# Authors

Obviously, [Dustin Senos](https://github.com/dustinsenos) & [Dustin Diaz](https://github.com/ded)

# License

Copyright 2012 [Obvious Corporation](http://obvious.com)

Licensed under the Apache License, Version 2.0: http://www.apache.org/licenses/LICENSE-2.0
