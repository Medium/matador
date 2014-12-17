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
 * @return {function (...) : string} Function that can be used to generate paths.  Arguments
 *    will be inserted into the place holders.
 */
PathMatcher.prototype.add = function (path, object) {
  var parts = this.getPathParts_(path)
  var matches = []
  var node = this.tree_
  var template = []
  for (var i = 0; i < parts.length; i++) {
    var name, part

    name = part = parts[i]

    if (part == '*' && i != parts.length - 1) {
      throw new Error('Invalid path [' + path + '], * must only be at the end.')
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
        node['@'][identifier] = {
          re: new RegExp(regExp),
          parent: node['@'],
          _reLiteral: regExp
        }
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
    throw new Error('Can not register [' + path + '], path is ambiguous. [' +
        node.fullPath + '] previously registered.')
  }
  node.matches = matches
  node.fullPath = path
  node.object = object

  // Return a function that knows how to reconstruct URLs for this path, given a set of arguments.
  return function (var_args) {
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
 * @return {?{object: Object, matches: Object.<string>}} An object
 *     corresponding to the matched path.
 */
PathMatcher.prototype.getMatch = function (path) {
  return this._getMatchRecursive(this.getPathParts_(path), 0, this.tree_, [], null)
}


/**
 * @param {Array.<string>} parts The parts to match.
 * @param {number} index The current part.
 * @param {Object} node The current node.
 * @param {Array} matches
 * @param {Array} wildcardMatch
 * @return {?{object: Object, matches: Object.<string>}} An object
 *     corresponding to the matched path.
 * @private
 */
PathMatcher.prototype._getMatchRecursive =
    function (parts, index, node, matches, wildcardMatch) {
  // The base case: we can't consume any more parts.
  if (index >= parts.length) {
    if (node && node.object) {
      var matchObj = {}
      if (wildcardMatch) {
        matchObj['*'] = wildcardMatch
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

  // Match the next part.
  var part = parts[index]
  var result = null

  // Direct strings
  if (node[part]) {
    result = this._getMatchRecursive(parts, index + 1, node[part], matches, null)
    if (result) return result
  }

  // Match regular expressions next.
  for (var n in node['@']) {
    if (n == 'parent') continue
    var reNode = node['@'][n]
    var tried = {}
    if (!(reNode._reLiteral in tried)) {
      tried[reNode._reLiteral] = reNode.re.test(part)
    }

    if (tried[reNode._reLiteral]) {
      matches.push(part)
      result = this._getMatchRecursive(parts, index + 1, reNode, matches, null)
      if (result) return result

      matches.pop()
    }
  }

  // Match named captures next.
  // All other captures are non-short-circuiting.
  if (node[':']) {
    matches.push(part)
    result = this._getMatchRecursive(parts, index + 1, node[':'], matches, null)
    if (result) return result

    matches.pop()
  }

  // Lastly, try to match the wildcard.
  if (node['*']) {
    return this._getMatchRecursive(parts, parts.length, node['*'], matches, parts.slice(index))
  }

  return null
}


/**
 * Splits a path into its component parts, stripping leading and trailing
 * slashes.
 * @param {string} path The path to split.
 * @return {!Array.<string>} The path parts.
 * @private
 */
PathMatcher.prototype.getPathParts_ = function (path) {
  return path.replace(/(^\/|\/$)/g, '').split('/').map(function (pathPart) {
    return decodeURIComponent(pathPart)
  })
}


module.exports = PathMatcher
