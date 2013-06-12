// Copyright The Obvious Corporation 2013

var fs = require('fs')

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

/**
 * Read directory's content, if it exists.
 *
 * @param {string} dir directory to read
 */
exports.readDir = function (dir) {
  return fs.existsSync(dir) ? fs.readdirSync(dir) : []
}

