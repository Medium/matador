#!/usr/bin/env node
var fs = require('fs')
  , exec = require('child_process').exec
require('colors')

var methods = {
  init: function (path) {
    console.log('installing Matador into ' + path)
    fs.mkdirSync('./' + path)
    exec('cp -R ' + __dirname + '/../src/all/ ' + path, function (err, out) {
      if (err) return console.log('error', err)
      console.log('Success!'.green)
    })
  }
, controller: function (name) {
    console.log('generating controller ' + name)
    var destinationFile = './app/controllers/' + name.replace(/^(.{1})/, function (m, l) {
      return l.toUpperCase()
    }) + 'Controller.js'
    var stub = __dirname + '/../src/StubController.js'
    exec('cp ' + stub + ' ' + destinationFile, function (er, out) {
      console.log('Successfully created ' + destinationFile)
    })
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
  methods[command] && methods[command].apply(methods, args)
}(process.argv.slice(2))