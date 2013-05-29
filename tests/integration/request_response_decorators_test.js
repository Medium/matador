var falkor = require('falkor')

var port = process.env.PORT || 3000

exports.testResponseRedirect = falkor.fetch('http://localhost:' + port + '/redirect')
  .expectStatusCode(302)
  .expectHeader('Location', '/target')
