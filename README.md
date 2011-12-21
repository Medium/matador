# Matador
An MVC framework for Node

## Create an app
    $ matador build ./my-app/

## Start your app

``` js
// app.js
require('matador').listen(3000)
```

## Build on your app

``` js
// routes.js
['get', '/', 'Home', 'hello/:name']

// HomeController.js
hello: function (name) {
  this.response.send('hello' + name)
}
```