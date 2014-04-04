
function postAnonController(req, res, next) {
  res.writeHead(301, {'Location': '/post-anon-controller-works-too'})
  res.end()
}

module.exports = function (app) {
  return {
    '/': 'Home.index',
    '/normal': 'Home.success',
    '/post': {
      'post': 'Home.post_success'
    }
  }
}
