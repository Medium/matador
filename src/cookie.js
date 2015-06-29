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

var Cookies = require('cookies')

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
  this.forceSecureCookies = forceSecureCookies
  this._cookies = new Cookies(req, res)
}


/**
 * Fetches a cookie from the request headers.
 * @param {string} name The cookie's name to fetch.
 * @param {string} opt_default Default value to return if the cookie is not set.
 * @return {string} The cookie's value.
 */
CookieService.prototype.get = function (name, opt_default) {
  var value = this._cookies.get(name)
  return typeof value !== 'undefined' ? value : opt_default
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

  this._cookies.set(name, value, options)
}
