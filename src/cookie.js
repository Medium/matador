/**
 * @fileoverview Service for setting and getting cookies
 *
 * Once installed a "cookies" service is available that exposes
 * <code>get(name, default)</code> and <code>set(name, value, options)</code>
 * methods. The options object can contain the following keys:
 *  - path - Path to scope to cookie to.
 *  - domain - Allows you to scope cookies to a subdomain.
 *  - expires - Date object or timestamp.
 *  - secure - Whether the cookie should only be sent over secure channels.
 *  - httpOnly - Tells the browser to only use the cookie on the HTTP protocol,
 *    i.e. not to client side scripts.
 *
 * @author dan@pupi.us (Daniel Pupius)
 */

module.exports = CookieService


/**
 * @param {Object} req the http request
 * @param {Object} res the http response
 * @param {boolean} forceSecureCookies if true force all cookies to be secure.
 *     This is intended to be used to secure an http server running behind an
 *     https proxy layer.
 * @constructor
 */
function CookieService(req, res, forceSecureCookies) {
  this.req = req
  this.res = res
  this.parsedCookies_ = null
  this.forceSecureCookies = forceSecureCookies
}


/**
 * Fetches a cookie from the request headers.
 * @param {string} name The cookie's name to fetch.
 * @param {string} opt_default Default value to return if the cookie is not set.
 * @return {string} The cookie's value.
 */
CookieService.prototype.get = function (name, opt_default) {
  var cookies = this.parseCookies_()
  var cookie = cookies[name]
  return typeof cookie !== 'undefined' ? cookie : opt_default
}


/**
 * Sets a cookie.
 * @param {string} name The cookie's name.
 * @param {string} value The value to set.
 * @param {Object=} options Optional options object containing some of the
 *    following: expires, path, domain, secure, httpOnly.
 */
CookieService.prototype.set = function (name, value, opt_options) {
  var options = {}

  if (opt_options) {
    for (var key in opt_options) {
        options[key] = opt_options[key];
    }
  }

  if (this.forceSecureCookies) {
    options.secure = true
  }

  var cookies = this.res.getHeader('Set-Cookie') || []
  if (typeof cookies === 'string') {
    cookies = [cookies]
  }
  //cookies.push(new Cookie(name, value, options).toString())
  this.res.setHeader('Set-Cookie', new Cookie(name, value, options).toString())
}


CookieService.prototype.parseCookies_ = function () {
  if (!this.parsedCookies_) {
    var cookies = this.parsedCookies_ = {}
    if (this.req.headers.cookie) {
      this.req.headers.cookie.split(';').forEach(function (cookie) {
        var parts = cookie.split('=')
        var name = parts[0].trim()
        // If multiple cookie's path match the client will send all of them. We
        // only consider the first, since it will be most specific. In the rare
        // case someone cares about all values, they can parse the header
        // themselves.
        if (!cookies[name]) {
          cookies[name] = (parts[1] || '').trim()
        }
      })
    }
  }
  return this.parsedCookies_
}



/**
 * @constructor
 */
function Cookie(name, value, options) {
  this.name = name
  this.value = value
  this.options = options
}


Cookie.prototype.toString = function () {
  var str = this.name + '=' + this.value
  if (this.options.maxAge) {
    str += '; expires=' + new Date(this.options.maxAge + Date.now()).toUTCString()
  } else if (this.options.expires) {
    str += '; expires=' + new Date(this.options.expires).toUTCString()
  }
  if (this.options.path) {
    str += '; path=' + this.options.path
  }
  if (this.options.domain) {
    str += '; domain=' + this.options.domain
  }
  if (this.options.secure) {
    str += '; secure'
  }
  if (this.options.httpOnly) {
    str += '; httponly'
  }
  return str
}
