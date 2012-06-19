# Matador
Sane defaults and a simple structure, scaling as your application grows.

Matador is a clean, organized framework for [Node.js](http://nodejs.org) architected to suit MVC enthusiasts. It gives you a well-defined development environment with flexible routing, easy controller mappings, and basic request filtering.
It&#8217;s built on open source libraries such as [Hogan.js](http://twitter.github.com/hogan.js) for view rendering, [Klass](https://github.com/ded/klass) for its inheritance model, [Valentine](https://github.com/ded/valentine)
for functional development, and [Express](http://expressjs.com) to give a bundle of other Node server related helpers.

# Installation
### Get the CLI
    $ npm install matador -g

### Create an app
    $ matador init my-app
    $ cd !$ && npm install matador

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
Uses Twitter's [Hogan.js](http://twitter.github.com/hogan.js/) with layouts, partials, and i18n support.

``` js
// app/controllers/HomeController.js
this.render(response, 'index', {
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

### View Partials

**To Be Updated**

Matador looks for view partials in a folder named partials in the views directory: ```app/views/partials/```

``` js
// app/controllers/HomeController.js
module.exports = function (app, config) {
  return app.controllers.Base.extend()
  .methods({
    index: function (req, res) {
      this.render(res, 'index', {
          user: {
              first: "John"
            , last: "Smith"
          }
        , todo: [{ name: 'dishes', id: 0 }, { name: 'mow lawn', id: 1 }]
      })
    }
  })
}
```

```html
<!-- app/views/partials/fullname.html -->
{{first}} {{last}}
```

```html
<!-- app/views/partials/tasks.html -->
<ul>
  {{#todo}}
  <li>{{name}}</li>
  {{/todo}}
</ul>
```

```html
<!-- app/views/index.html -->
<h1>Hello {{#user}}{{> fullname}}{{/user}} welcome to Matador!</h1>
{{> tasks}}
```

Produces the following HTML:

```html
<h1>Hello John Smith welcome to Matador!</h1>
<ul>
  <li>dishes</li>
  <li>mow lawn</li>
</ul>
```

### Overriding View Partials

Matador allows you to easily override view partials on a per-directory basis.
To override a partial create a new folder named 'partials' in the folder your controller is using as its ```viewFolder```.
Matador will look first in this folder for partials, if no matching partial exists it will traverse up the directory tree until it finds a matching partial.

``` js
// app/controllers/admin/AdminController.js
module.exports = function (app, config) {
  return app.getController('Application', true).extend(function () {
    this.viewFolder = "admin" // we've set the view folder to "admin"
  })
  .methods({
    index: function (req, res) {
      this.render(res, 'index', {
          user: {
              first: "John"
            , last: "Smith"
          }
        , todo: [{ name: 'dishes', id: 0 }, { name: 'mow lawn', id: 1 }]
      })
    }
  })
}
```

```html
<!-- app/views/admin/partials/tasks.html -->
<!-- This file will override the tasks.html partial found in app/views/partials -->
<ul>
{{#todo}}
<li><a href="/edit/{{id}}">Edit the "{{name}}" task </a> or <a href="/delete/{{id}}">delete it</a></li>
{{/todo}}
</ul>
```

```html
<!-- app/views/admin/index.html -->
<!-- 'app/views/admin/partials/fullname.html' Does not exist, so 'app/views/partials/fullname.html' will be used -->
<h1>Welcome {{#user}}{{> fullname}}{{/user}} to the Admin Area</h1>
{{> tasks}}
```

Produces the following HTML:

```html
<h1>Welcome John Smith to the Admin Area</h1>
<ul>
  <li><a href="/edit/0">Edit the "dishes" task</a> or <a href="/delete/0">delete it</a></li>
  <li><a href="/edit/1">Edit the "mow lawn" task</a> or <a href="/delete/1">delete it</a></li>
</ul>
```

**Note:** For performance reasons, partials are fetched when the application starts. You must restart your application for changes in partials to be reflected.

### Request Filtering
``` js
// app/controllers/ApplicationController.js
module.exports = function (app, config) {
  return app.controllers.Base.extend(function () {
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
