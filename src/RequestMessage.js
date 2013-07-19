// Copyright The Obvious Corporation 2013

/**
 * @fileoverview
 * A request message is a message builder for incoming requests.
 * By default, it logs the route taken, source IP address, parameters
 * and response code.
 *
 * Example of a request message with the default factory:
 *
 *   Thu, 18 Jul 2013 23:35:28 GMT - GET /people/29 (source 127.0.0.1)
 *     Parameters: {"id":"29"}
 *     Query: {}
 *     Controller: People.show
 *     Response: 200 in 39ms (6441 bytes)
 */
var useragent = require('useragent')

function RequestMessage() {
  this._sections = []
}

/**
 * A request message factory that includes the most common
 * request sections for logging purposes
 * @return {RequestMessage} a request message with default sections
 */
RequestMessage.buildDefaultMessage = function () {
  var message = new RequestMessage()

  message.addParameterSection()
  message.addQuerySection()
  message.addControllerSection()
  message.addResponseSection()

  return message
}

/**
 * Adds a section to the request message that logs the URI
 * parameters.
 */
RequestMessage.prototype.addParameterSection = function () {
  this.addMessageSection('Parameters', function (req, res) {
    return JSON.stringify(req.params)
  })
}

/**
 * Adds a section to the request message that logs the query string
 * parameters.
 */
RequestMessage.prototype.addQuerySection = function() {
  this.addMessageSection('Query', function (req, res) {
    return JSON.stringify(req.query)
  })
}

/**
 * Adds a section to the request message that logs the controller
 * and action that handled the request.
 */
RequestMessage.prototype.addControllerSection = function() {
  this.addMessageSection('Controller', function (req, res) {
    if (req.target) {
      return req.target.controllerName + '.' + req.target.methodName
    }
  })
}

/**
 * Adds a section to the request message that logs response:
 *  - status code
 *  - response time
 *  - body size
 *
 * E.g.: "Response: 200 in 39ms (6441 bytes)"
 */
RequestMessage.prototype.addResponseSection = function() {
  this.addMessageSection('Response', function (req, res) {
    var bodySize = ((res && res.getHeader('content-length')) || 'unknown') + ' bytes'
      , responseTime = this._finishTime - this._startTime

    return [
      res.statusCode,
      'in',
      responseTime + 'ms',
      '(' + bodySize + ')'
    ].join(' ')
  })
}

/** Add a new section to the request message. It takes a name and a builder
 * function.  The builder function receives the request and the response
 * objects for the function to inspect and build appropriate message.  See
 * .buildDefaultMessage for examples
 * @param {string} section the name of the section to be logged.
 * @param {function} builder function called to build
 * a message for the section sectionName
 */
RequestMessage.prototype.addMessageSection = function(sectionName, messageBuilder) {
  this._sections.push({name: sectionName, builder: messageBuilder})
}

/**
 * Builds a string using the registered request message sections
 * @param {http.Request} req request
 * @param {http.Response} res response
 * @return {string} the request message
 */
RequestMessage.prototype.buildMessage = function (req, res) {
  var messages = [this._buildHeader(req)]
    , sections = this._sections.map(function (section) {
      return this._buildSectionMessage(section, req, res)
    }.bind(this))

  sections = sections.filter(function (message) {
    return message && message.length > 0
  })

  return messages.concat(sections).join('\n') + '\n'
}

/**
 * Called when the request starts, used for calculating
 * request duration.
 */
RequestMessage.prototype.requestStart = function() {
  this._startTime = Date.now()
}

/**
 * Called when the request ends, used for calculating
 * request duration.
 */
RequestMessage.prototype.requestEnd = function() {
  this._finishTime = Date.now()
}

/**
 * Builds the default header for request message, including origin,
 * uri and time.
 * @private
 */
RequestMessage.prototype._buildHeader = function (req) {
  var method = req.method
    , uri = req.originalUrl
    , remoteAddress = req.headers['X-Forwarded-For'] || req.connection.remoteAddress

  return [
    new Date().toUTCString(),
    '-',
    method,
    uri,
    '(source ' + remoteAddress + ')'
  ].join(' ')
}

/**
 * Goes through all the registered sections and build its message.
 * @private
 */
RequestMessage.prototype._buildSectionMessage = function (section, req, res) {
  var message = section.builder.bind(this)(req, res)
  if (message) {
    return '  ' + section.name + ': ' + message
  }
}

module.exports = RequestMessage
