// TODO Make app boot from within the test. That requires
// server.js to be much simpler.

var falkor = require('falkor')

var port = process.env.PORT || 3000

exports.testCustomMiddlewareWorks = falkor.fetch('http://localhost:' + port + '/middleware')
  .expectStatusCode(301)
  .expectHeader('Location', '/middleware-is-working')

exports.testCustomMiddlewareWorks = falkor.fetch('http://localhost:' + port + '/middleware')
  .expectStatusCode(301)
  .expectHeader('Location', '/middleware-is-working')

exports.testCustomMiddlewareInMethod = falkor.fetch('http://localhost:' + port + '/post-middleware')
  .withMethod('POST')
  .expectStatusCode(301)
  .expectHeader('Location', '/post-middleware-works-too')

exports.testCustomMiddlewareInMethodFails = falkor.fetch('http://localhost:' + port + '/post-middleware')
  .withMethod('PUT')
  .expectStatusCode(500)
  .expectBodyMatches(/Error: Handler not found for PUT \/post-middleware/)

exports.testNormalRoutesWork = falkor.fetch('http://localhost:' + port + '/normal')
  .expectStatusCode(200)
  .expectBodyMatches(/Success!/)

exports.testSpecificMethodsWork = falkor.fetch('http://localhost:' + port + '/post')
  .withMethod('POST')
  .expectStatusCode(200)
  .expectBodyMatches(/POST Success!/)

exports.testSpecificMethodFailsToRoute = falkor.fetch('http://localhost:' + port + '/post')
  .withMethod('GET')
  .expectStatusCode(500)
  .expectBodyMatches(/Error: Handler not found for GET \/post/)
