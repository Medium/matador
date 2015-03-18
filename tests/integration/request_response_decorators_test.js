var falkor = require('falkor')

var port = process.env.PORT || 3000

exports.testResponsePermanentRedirect = falkor.fetch('http://localhost:' + port + '/redirectPermanent')
  .expectStatusCode(301)
  .expectHeader('Location', '/elsewhere')

exports.testResponseRedirect = falkor.fetch('http://localhost:' + port + '/redirect')
  .expectStatusCode(302)
  .expectHeader('Location', '/target')

exports.testQueryStrings = falkor.fetch('http://localhost:' + port + '/queryStrings?hello=world&ole=toro')
  .expectStatusCode(200)
  .evaluate(function (test, res) {
    var json = JSON.parse(res.body)
    test.equal('world', json['hello'])
    test.equal('toro', json['ole'])
    test.done()
  })
