// Copyright The Obvious Corporation 2013

/**
 * File loading logic. Caches all the files that are loaded for
 * fast retrieval.
 */
var fsutils = require('./fsutils')
  , path = require('path')
  , fs = require('fs')
  , v = require('valentine')

function FileLoader(app, basePath, paths) {
  this._app = app
  this._basePath = basePath

  this._listingCache = {}
  this._fileCache = {}

  // TODO Make ClassLoader not need to inspect this
  this.pathCache = {}
  this.paths = paths

  Object.keys(paths).forEach(function (type) {
    this._fileCache[paths[type]] = {}
    this.pathCache[paths[type]] = {}
  }.bind(this))

  this.appDirs = [basePath].concat(v(function () {
    var dir = basePath + '/modules'
    return fsutils.readDir(dir)
  }()).map(function (dir) {
    return basePath + '/modules/' + dir
  }))
}

/**
 * Verify if the file exists, inspecting the local listing cache beforehand.
 */
FileLoader.prototype.fileExists = function (filename) {
  // We check for file existence this way so that our lookups are case sensitive regardless of the underlying filesystem.
  var dir = path.dirname(filename)
    , base = path.basename(filename)

  if (!this._listingCache[dir]) {
    this._listingCache[dir] = fsutils.readDir(dir)
  }

  return this._listingCache[dir].indexOf(base) !== -1
}

/**
 * Loads the file from the subdir, add it to the cache.
 * If the file happens to be within the helpers folder,
 * trigger a 'createHelper' event.
 */
FileLoader.prototype.loadFile = function (subdir, name, p) {
  if (this._fileCache[subdir][name]) return this._fileCache[subdir][name]

  var pathname = name.replace(/\./g, '/')
  var dir = v.find((p ? [p] : this.appDirs), function (dir) {
    var filename = dir + '/' + subdir + '/' + pathname + '.js'
    if (!this.fileExists(filename)) return false
    try {
      this._fileCache[subdir][name] = require(filename)(this._app, this._app.getConfig(subdir, name))
      // emit event saying a helper was just created w/ name - Helper
      if (subdir === this.paths.HELPERS) this._app.emit('createHelper', name.substr(0, name.length - 6), this._fileCache[subdir][name])
    } catch (e) {
      console.error('Error loading file:', subdir, name, p, e.stack)
      throw e
    }
    this.pathCache[subdir][name] = dir === this._basePath ? [this._basePath] : [dir, this._basePath]
    return true
  }.bind(this))
  if (!dir) throw new Error('Unable to find ' + subdir + '/' + pathname)
  return this._fileCache[subdir][name]
}

module.exports = FileLoader
