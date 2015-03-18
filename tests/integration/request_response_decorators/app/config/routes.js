module.exports = function (app) {
  return {
    '/redirect': 'Home.redirect',
    '/redirectPermanent': 'Home.redirectPermanent',
    '/target': 'Home.target',
    '/queryStrings': 'Home.queryStrings'
  }
}
