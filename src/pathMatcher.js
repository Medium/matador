// Copyright 2012 The Obvious Corporation.

/**
 * @fileoverview Class used to match paths against arbitrary objects.
 */

/**
 * @constructor
 */
function PathMatcher() {
  this.tree_ = {}
}

/**
 * Adds an object to be matched for the given path.  Paths can contain
 * wildcards in the form ':identifier'.  * will match anything following.  The
 * most specific path will be used.
 *
 * e.g.
 *   /tags/:tagname/
 *   /photos/:user/:set/
 *   /@type:(feeds|api)/posts/:postid/
 *   /search/*
 * @param {string} path The path to match.
 * @param {Object} object The object to associate with the path.
 * @return {function (...args) : string} Function that can be used to generate paths.  Arguments
 *    will be inserted into the place holders.
 */
PathMatcher.prototype.add = function(path, object) {
  var parts = this.getPathParts_(path)
  var matches = []
  var node = this.tree_
  var template = []
  for (var i = 0; i < parts.length; i++) {
    var name = part = parts[i]
    if (part == '*' && i != parts.length - 1) {
      throw Error('Invalid path [' + path + '], * must only be at the end.')
    }
    if (part[0] == ':') {
      name = ':'
      matches.push(part.substr(1))
      template.push(null)
    } else if (part[0] == '@') {
      var colon = part.indexOf(':')
      var identifier = part.substr(1, colon - 1)
      var regExp = part.substr(colon + 1)
      name = '@'
      if (!node['@']) {
        node['@'] = {parent: node}
      }
      if (!node['@'][identifier]) {
        node['@'][identifier] = {re: new RegExp('(' + regExp + ')'), parent: node['@']}
      }
      matches.push(identifier)
      node = node['@'][identifier]
      template.push(null)
      continue
    } else {
      template.push(name)
    }
    if (!node[name]) {
      node[name] = {parent: node}
    }
    node = node[name]
  }
  if (node.object) {
    throw Error('Can not register [' + path + '], path is ambiguous. [' +
        node.fullPath + '] previously registered.')
  }
  node.matches = matches
  node.fullPath = path
  node.object = object

  // Return a function that knows how to reconstruct URLs for this path, given a set of arguments.
  return function(var_args) {
    // TODO(dan): This does not validate regexp rules.
    var path = [], n = 0
    for (var i = 0; i < template.length; i++) {
      if (template[i] == null) path.push(arguments[n++])
      else if (template[i] == '*') path.push(Array.prototype.slice.call(arguments, n).join('/'))
      else path.push(template[i])
    }
    return '/' + path.join('/')
  }
}


/**
 * Gets the matching node for the given path.  If no path matches, then null.
 * @param {string} path The path to match.
 * @return {Object} An object corresponding to the matched path.
 */
PathMatcher.prototype.getMatch = function(path) {
  var parts = this.getPathParts_(path)
  var node = this.tree_
  var pendingWildcard = null, pendingWildcardMatch = [], matches = []
  for (var i = 0; i < parts.length; i++) {
    var part = parts[i]
    var gotMatch = false

    if (node['*']) {
      pendingWildcard = node['*']
      pendingWildcardMatch = []
    }
    if (node[part]) {
      node = node[part]
      gotMatch = true
    }
    if (!gotMatch && node['@']) {
      for (var n in node['@']) {
        if (n == 'parent') continue
        var reNode = node['@'][n]
        if (reNode.re.test(part)) {
          node = reNode
          matches.push(part)
          gotMatch = true
          break
        }
      }
    }
    if (!gotMatch && node[':']) {
      node = node[':']
      gotMatch = true
      matches.push(part)
    }
    if (!gotMatch) {
      node = node['*'] || pendingWildcard || null
      pendingWildcardMatch = pendingWildcardMatch.concat(parts.slice(i))
      break
    }
    if (pendingWildcard) {
      pendingWildcardMatch.push(part)
    }
  }

  // If we stopped at a node but it doesn't have an object associated with it
  // then fallback to an open wildcard node.
  if (!node.object && pendingWildcard) {
    node = pendingWildcard
  }

  if (node && node.object) {
    var matchObj = {}
    if (pendingWildcard == node) {
      matchObj['*'] = pendingWildcardMatch
    }
    for (var j = 0; j < node.matches.length; j++) {
      matchObj[node.matches[j]] = matches[j]
    }
    return {
      object: node.object,
      matches: matchObj
    }
  } else {
    return null
  }
}


/**
 * Splits a path into its component parts, stripping leading and trailing
 * slashes.
 * @param {string} path The path to split.
 * @return {!Array.<string>} The path parts.
 * @private
 */
PathMatcher.prototype.getPathParts_ = function(path) {
  return path.replace(/(^\/|\/$)/g, '').split('/')
}


module.exports = PathMatcher
