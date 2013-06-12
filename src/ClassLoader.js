// Copyright The Obvious Corporation 2013

function ClassLoader(fileLoader) {
  this._fileLoader = fileLoader

  this._objCache = {}
  Object.keys(fileLoader.paths).forEach(function (type) {
    this._objCache[fileLoader.paths[type]] = {}
  }.bind(this))
}

ClassLoader.prototype.loadClass = function (subdir, name, localName, definitionOnly) {
  if (definitionOnly) return this._fileLoader.loadFile(subdir, name)
  if (!this._objCache[subdir][name]) {
    var File = this._fileLoader.loadFile(subdir, name)
    this._objCache[subdir][name] = new File(localName, this._fileLoader.pathCache[subdir][name])
    this._objCache[subdir][name]._paths = this._fileLoader.pathCache[subdir][name]
  }
  return this._objCache[subdir][name]
}

module.exports = ClassLoader
