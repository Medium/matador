var falkor = require('falkor')

var port = process.env.PORT || 3000

exports.testServerResponds = falkor.fetch('http://localhost:' + port + '/')
  .expectBodyMatches(/^It works$/)
  .expectStatusCode(200)
