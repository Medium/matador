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
 *     Body: {}
 *     Controller: People.show
 *     Response: 200 in 39ms (6441 bytes)
 */
var useragent = require('useragent')

function RequestMessage() {
  this._events = []
}

/**
 * A request message factory that includes the most common
 * request events for logging purposes
 * @return {RequestMessage} a request message with default events
 */
RequestMessage.buildDefaultMessage = function () {
  var message = new RequestMessage()

  message.addRequestEvent('Parameters', function (req, res) {
    return JSON.stringify(req.params)
  })

  message.addRequestEvent('Query', function (req, res) {
    return JSON.stringify(req.query)
  })

  message.addRequestEvent('Controller', function (req, res) {
    if (req.target) {
      return req.target.controllerName + '.' + req.target.methodName
    }
  })

  message.addRequestEvent('Response', function (req, res) {
    var bodySize = ((res && res.getHeader('content-length')) || 'unknown') + ' bytes'
      , responseTime = this._finishTime - this._startTime

    return [
      res.statusCode,
      'in',
      responseTime + 'ms',
      '(' + bodySize + ')'
    ].join(' ')
  })

  return message
}

/**
 * Add a new event to the request. It takes a name and a builder function.
 * The builder function receives the request and the response objects
 * for the function to inspect and build appropriate message.
 * See .buildDefaultMessage for examples
 * @param {string} eventName the name of the event to be logged.
 * @param {function} builder function called to build a message for the event
 * eventName
 */
RequestMessage.prototype.addRequestEvent = function(eventName, builder) {
  this._events.push({name: eventName, builder: builder})
}

/**
 * Builds a string using the registered request events
 * @param {http.Request} req request
 * @param {http.Response} res response
 * @return {string} the request message
 */
RequestMessage.prototype.buildMessage = function (req, res) {
  var messages = [this._buildHeader(req)]
    , events = this._events.map(function (event) {
      return this._buildEventMessage(event, req, res)
    }.bind(this))

  events = events.filter(function (message) {
    return message && message.length > 0
  })

  return messages.concat(events).join('\n') + '\n'
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
 * Goes through all the registered events and build its message.
 * @private
 */
RequestMessage.prototype._buildEventMessage = function (event, req, res) {
  var message = event.builder.bind(this)(req, res)
  if (message) {
    return '  ' + event.name + ': ' + message
  }
}

module.exports = RequestMessage

