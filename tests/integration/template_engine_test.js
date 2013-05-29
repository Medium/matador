var falkor = require('falkor')

var port = process.env.PORT || 3000

exports.testTemplateRendered = falkor.fetch('http://localhost:' + port + '/old')
  .expectBodyMatches(new RegExp('<h1>Hello from Soy</h1>'))
  .expectStatusCode(200)

exports.testOldSyntaxTemplateRendered = falkor.fetch('http://localhost:' + port + '/soy')
  .expectBodyMatches(new RegExp('<h1>Hello from Soy</h1>'))
  .expectStatusCode(200)
