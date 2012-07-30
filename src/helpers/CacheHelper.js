// Copyright 2012 The Obvious Corporation.

/**
 * Helper for dealing with cache headers.
 */
module.exports = function (app) {

  var ONE_MONTH_IN_SECS = 60 * 60 * 24 * 28

  /**
   * Sets the cache policy for a response to be uncacheable.
   * Note: The Cache-Control header, as specified in HTTP 1.1 will take precedence.
   */
  function setNoCache(res) {
    res.setHeader('Cache-Control', 'no-cache, no-store, max-age=0, must-revalidate')
    res.setHeader('Expires', 'Thu, 09 Sep 1999 09:09:09 GMT')
    res.setHeader('Pragma', 'no-cache')
  }

  /**
   * Sets the cache policy for a response to be privately cacheable for a certain amount of time,
   * which by default will be 1-month.
   * Note: The Cache-Control header, as specified in HTTP 1.1 will take precedence.
   */
  function setPrivate(res, opt_expiresSecs) {
    var secs = typeof opt_expiresSecs != 'undefined' ? opt_expiresSecs : ONE_MONTH_IN_SECS
    res.setHeader('Cache-Control', 'private, must-revalidate, max-age=' + secs)
    res.setHeader('Expires', new Date(Date.now() + secs * 1000).toUTCString())
    res.setHeader('Pragma', 'private')
  }

  /**
   * Sets the cache policy for a response to be publicly cacheable, and will by default cache
   * for 1-month.
   * Note: The Cache-Control header, as specified in HTTP 1.1 will take precedence.
   */
  function setPublic(res, opt_expiresSecs) {
    var secs = typeof opt_expiresSecs != 'undefined' ? opt_expiresSecs : ONE_MONTH_IN_SECS
    res.setHeader('Cache-Control', 'public, must-revalidate, max-age=' + secs)
    res.setHeader('Expires', new Date(Date.now() + secs * 1000).toUTCString())
    res.setHeader('Pragma', 'public')
  }

  /**
   * Middleware method for setting a response to be uncacheable.
   */
  function noCacheMiddleware(req, res, next) {
    setNoCache(res)
    next()
  }

  /**
   * Middleware method that hooks into the request/response objects and audits the request headers.
   */
  function auditHeadersMiddleware(req, res, next) {
    _hookRequestResponse(req, res)
    next()
  }

  /**
   * Accumulates all headers that are set on a response and performs an audit when
   * the response is finished.  It also hooks into 'Set-Cookie' to ensure that the
   * cache headers have already been set appropriately.
   *
   * Responses should have an explicit cache policy set and no cookies should be
   * sent on a response that is publically cacheable.
   *
   * @private
   */
  function _hookRequestResponse(req, res) {
    var writeHead = res.writeHead
    var setHeader = res.setHeader
    var end = res.end

    var allHeaders = {}

    res.writeHead = function (status, reason, headers) {
      headers = headers || {}
      var keyMap = _lowerCaseKeyMap(headers)
      if (keyMap['set-cookie'] && !_areCookiesAllowed(req, status, allHeaders)) {
        _errorHelper(status, headers[keyMap['set-cookie']])
        delete headers[keys['set-cookie']]
      }

      v.extend(allHeaders, headers)
      writeHead.call(res, status, reason, headers)
    }

    res.setHeader = function (name, value) {
      var lowerName = name.toLowerCase()
      if (lowerName == 'set-cookie' && !_areCookiesAllowed(req, res.statusCode, allHeaders)) {
        _errorHelper(res.statusCode, {name: value})
        return
      }

      allHeaders[name] = value
      setHeader.call(res, name, value)
    }

    res.end = function (chunk, encoding) {
      // This won't failout any requests, since the response headers may already have been
      // sent by now.  It just does a final audit and logs to the console.
      _auditHeaders(req, res.statusCode, allHeaders)
      end.call(res, chunk, encoding)
    }

    function _errorHelper(status, misc) {
      console.error('Illegal attempt to Set-Cookie, the response does not have correct cache policies.  ' +
          'The header will be stripped and the cookie will not be set.  The calling code should be fixed to ' +
          'not send the cookie or the response should be made private or uncacheable.  The requested resource was "' +
          req.method + ' ' + req.url + ' (' + status + ')".  Callstack was ' + new Error().stack, misc)
    }
  }

  /**
   * Audits the response headers and logs warnings to the console if there are problems.
   *
   * @param {Object} req The request object.
   * @param {number} status The response status code.
   * @param {Object} headers Map of response headers.
   *
   * @private
   */
  function _auditHeaders(req, status, headers) {
    var keyMap = _lowerCaseKeyMap(headers)

    // We always want explicit cache policies, so log a warning if there is no cache-control header.
    if (!('cache-control' in keyMap)) {
      console.warn('Missing Cache-Control policy when requesting "' + req.method + ' ' + req.url + ' (' + status + ')".')
    }

    // Make sure cookies are allowed to be set.  This should already have been logged, but better to be safe than sorry.
    if (('set-cookie' in keyMap) && !_areCookiesAllowed(req, status, headers, keyMap)) {
      console.warn('Cookies being sent when not allowed when requesting "' + req.method + ' ' + req.url + ' (' + status + ')".')
    }
  }

  /**
   * Returns true if cookies are allowed to be set on the response, given the headers that were set.
   *
   * This is based on the requirements set by HAProxy's "checkcache" feature, but is slightly more
   * conservative with the cache-control headers that are required.
   *
   * @param {Object} req The request object.
   * @param {number} status The response status code.
   * @param {Object} headers Map of response headers.
   * @param {Object=} opt_keyMap Optional precomputed key map, from lowercase key to original key.
   * @return {boolean} Whether cookies can be set on the response, given its cache policies.
   * @private
   */
  function _areCookiesAllowed(req, status, headers, opt_keyMap) {
    var keyMap = opt_keyMap || _lowerCaseKeyMap(headers)
    var cacheControl = _parseHeaderDirectives(headers[keyMap['cache-control']])

    // Allow return codes, except the following, but only if the response isn't explicitly public.
    if ([200, 203, 206, 300, 301, 410].indexOf(status) == -1 && !cacheControl['public']) {
      return true
    }

    // Allow responses to POST/PUT/DELETE, but only if the response isn't explicitly public.
    // See section 13.10 of RFC2616.
    if (!cacheControl['public'] && (req.method == 'POST' || req.method == 'PUT' || req.method == 'DELETE')) {
      return true
    }

    // For all other types of request, only allow cookies if they are not-cacheable or privately cacheable.
    return cacheControl['private'] === true || cacheControl['no-cache'] === true
  }

  /**
   * Parses a header string that contains multiple directives.
   *
   * @param {string} The header value, for example: no-store, private=test, no-cache="Set-Cookie, X-Token", max-age=0
   * @return {Object} Map of directives to their value.  (true for entries that are just a directive name)
   * @private
   */
  function _parseHeaderDirectives(header) {
    if (!header) return {}

    var originalHeader = header

    // Match the regular expression against the beginning of the header.  If it matches
    // remove it from the header and return.
    function getNextToken(re) {
      var result = header.match(re)
      if (result) {
        header = header.substr(result[0].length)
        return result[0]
      }
      return null
    }

    // Throws a parse error, where the message shows were the error occurred.
    function error(msg) {
      throw new Error('Header parse error, ' + msg + ' at:\n' +
          originalHeader + '\n' + new Array(originalHeader.length - header.length).join(' ') + '^\n')
    }

    // Parse the header, one token at a time.
    var directives = {}
    while (header.length > 0) {
      var name = getNextToken(/^[a-z-]+/)
      if (!name) error('expected directive')

      var quotedValue = getNextToken(/^="[^"]*"/)
      if (quotedValue) {
        directives[name] = quotedValue.substring(2, quotedValue.length - 1)

      } else {
        var value = getNextToken(/^=[^",]+/)
        if (value) {
          directives[name] = value.substr(1)
        } else {
          directives[name] = true
        }
      }

      // Strip the separator.
      var separator = getNextToken(/^\s*,\s*/)
      if (!separator && header.length !== 0) error('expected separator')
    }

    return directives
  }

  /**
   * Creates a mapping of lowercase key names to their original key.
   * @param {Object} original
   * @return {Object}
   * @private
   */
  function _lowerCaseKeyMap(original) {
    var keys = {}
    for (var key in original) {
      keys[key.toLowerCase()] = key
    }
    return keys
  }


  return {
      // General helpers for setting cache headers.
      setNoCache: setNoCache
    , setPrivate: setPrivate
    , setPublic: setPublic

      // Middleware methods.
    , noCacheMiddleware: noCacheMiddleware
    , auditHeadersMiddleware: auditHeadersMiddleware
  }
}
