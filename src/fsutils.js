var fs = require('fs')
  , path = require('path')

// TODO Move listingCache to its own thing
var listingCache = {}
  , existsSync = fs.existsSync || path.existsSync
 
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

exports.fileExists = function (filename) {
  // We check for file existence this way so that our lookups are case sensitive regardless of the underlying filesystem.
  var dir = path.dirname(filename)
    , base = path.basename(filename)

  if (!listingCache[dir]) {
    listingCache[dir] = existsSync(dir) ? fs.readdirSync(dir) : []
  }

  return listingCache[dir].indexOf(base) !== -1
}

exports.existsSync = existsSync
