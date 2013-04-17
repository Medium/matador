#!/usr/bin/env node
var fs = require('fs')
  , exec = require('child_process').exec

var methods = {
  init: function (path) {
    if (!path) {
      console.log("No app name given\n")
      this.usage()
      return 0
    }

    console.log('installing Matador into ' + path)

    fs.exists(path, function (exists) {
      if (exists) {
        console.log(path + " already exists")
      } else {
        fs.mkdirSync('./' + path)
        exec('cp -R ' + __dirname + '/../src/all/ ' + path, function (err, out) {
          if (err) return console.log('error', err)
          console.log('Success!')
        })
      }
    })
  }
, controller: function (name) {
    if (!name) {
      console.log("No controller name given\n")
      this.usage()
      return 0
    }

    if (name.match(/([^\/]+)\//)) {
      exec('mkdir -p ' + RegExp.$1, copyContents)
    }
    else {
      copyContents()
    }

    function copyContents() {
      var destinationFile = './app/controllers/' + name.replace(/(?:[^\/]+)$/, function (m) {
        return m.replace(/(.{1})/, function (m, l) {
          return l.toUpperCase()
        })
      }) + 'Controller.js'
      console.log('generating controller ' + destinationFile)
      var stub = __dirname + '/../src/StubController.js'

      fs.exists(destinationFile, function(exists) {
        if (exists) {
          console.log(destinationFile + " already exists")
        } else {
          exec('cp ' + stub + ' ' + destinationFile, function (er, out) {
            console.log('Successfully created ' + destinationFile)
          })
        }
      })
    }
  }
, model: function (name) {
    if (!name) {
      console.log("No model name given\n")
      this.usage()
      return 0
    }

    console.log('generating model ' + name)
    var destinationFile = './app/models/' + name.replace(/^(.{1})/, function (m, l) {
      return l.toUpperCase()
    }) + 'Model.js'
    var stub = __dirname + '/../src/StubModel.js'

    fs.exists(destinationFile, function(exists) {
      if (exists) {
        console.log(destinationFile + " already exists")
      } else {
        exec('cp ' + stub + ' ' + destinationFile, function (er, out) {
          console.log('Successfully created ' + destinationFile)
        })
      }
    })
  }
, help: function () {
    console.log("Matador - a clean, organized framework for Node.js\n")
    this.usage()
  }
, usage: function () {
    console.log("usage:")
    console.log("\tinit <name> - Generate a new app called <name>")
    console.log("\tcontroller <name> - Generate a new controller called <name>")
    console.log("\tmodel <name> - Generate a new model called <name>\n")
  }
}

!function (args) {
  var command = args.shift()
  if (!command) methods.help.apply(methods)
  else methods[command] && methods[command].apply(methods, args)
}(process.argv.slice(2))
