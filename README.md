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
['get', '/hello/:name', 'Home', 'hello']

// app/controllers/HomeController.js
hello: function (name) {
  this.response.send('hello' + name)
}
```

### View Rendering
Uses Twitters [Hogan.js](http://twitter.github.com/hogan.js/) with layouts, partials, and i18n support.

``` js
// app/controllers/HomeController.js
this.render('index', {
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

### Request Filtering
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

### How can I organize my Models?
By default, Models are thin with just a Base and Application Model in place. You can give them some meat, for example, and embed [Mongo](http://mongoosejs.com) Schemas. See the following as a brief illustration:

``` js
// app/models/ApplicationModel.js
module.exports = require('./BaseModel').extend(function () {
  this.mongo = require('mongodb')
  this.mongoose = require('mongoose')
  this.Schema = this.mongoose.Schema
  this.mongoose.connect('mongodb://localhost/myapp')
})
```

Then create, for example, a UserModel.js that extended it...

``` js
module.exports = require('./ApplicationModel').extend(function () {
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

# Todo
There are always things to do. Our short-list currently includes the following:

  * ~~build more scaffolding commands (for models, controllers, helpers)~~
  * official docs
  * ~~better view partials support~~


# Contributing

Questions, pull requests, bug reports are all welcome. Submit them here on Github.

# Authors

Obviously, [Dustin Senos](https://github.com/dustinsenos) & [Dustin Diaz](https://github.com/ded)

# License

Copyright 2012 [Obvious Corporation](http://obvious.com)

Licensed under the Apache License, Version 2.0: http://www.apache.org/licenses/LICENSE-2.0