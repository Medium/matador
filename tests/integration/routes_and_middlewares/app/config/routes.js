function anonController(req, res, next) {
  res.writeHead(301, {'Location': '/anon-controller-is-working'})
  res.end()
}

function postAnonController(req, res, next) {
  res.writeHead(301, {'Location': '/post-anon-controller-works-too'})
  res.end()
}

function itsNotAMiddleware(req, res, next) {
  res.setHeader('X-Hello', 'hi')

  // When there are no more middlewares/controllers to call,
  // render a 404.
  next()
}

module.exports = function (app) {
  return {
    '/': 'Home.index',
    '/anon': anonController,
    '/post-anon': {
      'post': postAnonController
    },
    '/normal': 'Home.success',
    '/post': {
      'post': 'Home.post_success'
    },
    '/last': itsNotAMiddleware
  }
}
