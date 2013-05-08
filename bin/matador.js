#!/usr/bin/env node
var fs = require('fs')
  , exec = require('child_process').exec
  , path = require('path')

var methods = {
  init: function (path) {
    console.log('installing Matador into ' + path)
    fs.mkdirSync('./' + path)
    exec('cp -R ' + __dirname + '/../src/all/ ' + path, function (err, out) {
      if (err) return console.log('error', err)
      console.log('Success!')
    })
  }
, controller: function (name) {
    if (name.match(/([^\/]+)\//)) {
      exec('mkdir -p ' + RegExp.$1, copyContents)
    }
    else {
      copyContents()
    }
    function copyContents() {
      var className = name.replace(/(?:[^\/]+)$/, function (m) {
        return m.replace(/(.{1})/, function (m, l) {
          return l.toUpperCase()
        })
      })

      var destinationFile = './app/controllers/' + className + 'Controller.js'
      console.log('generating controller ' + destinationFile)
      var stub = __dirname + '/../src/StubController.js'
      fs.readFile(stub, function (er, stubContent) {
        var content = stubContent.toString().replace(/Stub/g, className)
        fs.writeFile(destinationFile, content, function (er) {
          console.log('Successfully created ' + destinationFile)
        })
      })
    }
  }
, model: function (name) {
    console.log('generating model ' + name)
    var destinationFile = './app/models/' + name.replace(/^(.{1})/, function (m, l) {
      return l.toUpperCase()
    }) + 'Model.js'
    var stub = __dirname + '/../src/StubModel.js'
    exec('cp ' + stub + ' ' + destinationFile, function (er, out) {
      console.log('Successfully created ' + destinationFile)
    })
  }
}
!function (args) {
  var command = args.shift()
  if (!command) {
    console.log('Usage: ')
    console.log('   ' + path.basename(process.argv[1]) + ' init <app-name>')
    console.log('   ' + path.basename(process.argv[1]) + ' controller <controller-name>')
    return
  }
  methods[command] && methods[command].apply(methods, args)
}(process.argv.slice(2))
