// Copyright The Obvious Corporation 2013

var fs = require('fs')
  , path = require('path')

exports.existsSync = fs.existsSync || path.existsSync
 
/**
 * Check whether a path exists and is a directory
 *
 * @param {string} path the path
 */
exports.isDirectory = function (path) {
  try {
    return fs.statSync(path).isDirectory()
  }
  catch (ex) {
    return false
  }
}

exports.readDir = function (dir) {
  return exports.existsSync(dir) ? fs.readdirSync(dir) : []
}

