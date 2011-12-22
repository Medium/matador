#!/usr/bin/env node
var fs = require('fs')
  , exec = require('child_process').exec
require('colors')

!function (args) {
  var install_dir = args[0]
  console.log('installing into...', install_dir)
  if (install_dir) {
    fs.mkdirSync('./' + install_dir)
    exec('cp -R ' + __dirname + '/../src/app/ ' + install_dir, function (err, out) {
      if (err) return console.log('error', err)
      console.log('successfully created app')
    })
  }
}(process.argv.slice(2))