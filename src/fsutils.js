var fs = require('fs')
  , path = require('path')

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

exports.existsSync = fs.existsSync || path.existsSync
