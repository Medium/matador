var falkor = require('falkor')

var port = process.env.PORT || 3000

exports.testHogan = falkor.fetch('http://localhost:' + port + '/hogan')
  .expectBodyMatches(new RegExp('<h1>Hello hogan.js</h1>'))
  .expectStatusCode(200)

exports.testSoyNode = falkor.fetch('http://localhost:' + port + '/soy')
  .expectBodyMatches(new RegExp('<h1>Hello from Soy</h1>'))
  .expectStatusCode(200)
