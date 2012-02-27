#!/usr/bin/env node
var fs = require('fs')
  , exec = require('child_process').exec

	/**
	 * Quick method to copy files
	 */
	, cp = function(oldFile, newFile, fn) {
    var oldFileStream = fs.createReadStream(oldFile)
    	, newFileStream = fs.createWriteStream(newFile)
			, fn = fn || function () {
        console.log('Successfully created ' + newFile)
      }

		newFileStream.once('open', function(fd){
      require('util').pump(oldFileStream, newFileStream, fn)
    })
	}

	/**
	 * Quick method to copy files,
	 * type-R because it's fast
	 */
  , cpR = function(source, dest) {
		// Create the desination directory
    var checkDir = fs.statSync(source)
    fs.mkdirSync(dest, checkDir.mode)

    var files = fs.readdirSync(source)

    for(var i = 0; i < files.length; i++) {
        var thisFile = fs.lstatSync(source + "/" + files[i])

        if(thisFile.isDirectory()) {
					// Recursive case
					cpR(source + "/" + files[i], dest + "/" + files[i])
        } else {
					// Single file case
					cp(source + "/" + files[i], dest + "/" + files[i])
        }
    }
}

var methods = {
  init: function (path) {
    console.log('installing Matador into ' + path)
    cpR(__dirname + '/../src/all', path)
  }
, controller: function (name) {
    if (name.match(/([^\/]+)\//)) {
      exec('mkdir -p ' + RegExp.$1, copyContents)
    }
    else {
      copyContents()
    }
    function copyContents() {
      var newFile = './app/controllers/' + name.replace(/(?:[^\/]+)$/, function (m) {
        return m.replace(/(.{1})/, function (m, l) {
          return l.toUpperCase()
        })
      }) + 'Controller.js'
			, oldFile = __dirname + '/../src/StubController.js'
      console.log('generating controller ' + newFile)

	    cp(oldFile, newFile)
    }
  }
, model: function (name) {
    console.log('generating model ' + name)
    var newFile = './app/models/' + name.replace(/^(.{1})/, function (m, l) {
      return l.toUpperCase()
    }) + 'Model.js'
			, oldFile = __dirname + '/../src/StubModel.js'

    cp(oldFile, newFile)
  }
}
!function (args) {
  var command = args.shift()
  methods[command] && methods[command].apply(methods, args)
}(process.argv.slice(2))