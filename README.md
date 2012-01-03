# Matador
An MVC framework for Node built on [Express](http://expressjs.com) and [Klass](https://github.com/ded/klass).

## Install Matador binary
    $ npm install matador -g

## Create an app
    $ matador build ./my-app/

## Start your app
    $ cd my-app
    $ node server.js

``` js
// app.js
require('matador').listen(3000)
```

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
this.response.render('index', {
  locals: {
    title: 'Hello Bull Fighters'
  }
})
```