// TODO Make app boot from within the test. That requires
// server.js to be much simpler.

var falkor = require('falkor')

var port = process.env.PORT || 3000

exports.testCustomMiddlewareWorks = falkor.fetch('http://localhost:' + port + '/anon')
  .expectStatusCode(301)
  .expectHeader('Location', '/anon-controller-is-working')

exports.testCustomMiddlewareInMethod = falkor.fetch('http://localhost:' + port + '/post-anon')
  .withMethod('POST')
  .expectStatusCode(301)
  .expectHeader('Location', '/post-anon-controller-works-too')

exports.testCustomMiddlewareInMethodFails = falkor.fetch('http://localhost:' + port + '/post-anon')
  .withMethod('PUT')
  .expectStatusCode(500)
  .expectBodyMatches(/Error: Handler not found for PUT \/post-anon/)

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

/** Filters **/

exports.testGlobalFilters = falkor.fetch('http://localhost:' + port)
  .expectStatusCode(200)
  .expectHeader('X-GlobalBeforeFilter', 'Works')
  .evaluate(function (test, res) {
    test.equals(res.headers['X-LocalBeforeFilter'], undefined)
  })

exports.testLocalFilters = falkor.fetch('http://localhost:' + port + '/normal')
  .expectStatusCode(200)
  .expectHeader('X-GlobalBeforeFilter', 'Works')
  .expectHeader('X-LocalBeforeFilter', 'Works')

exports.testLastMiddleware = falkor.fetch('http://localhost:' + port + '/last')
  .expectStatusCode(404)
  .expectHeader('X-Hello', 'hi')
