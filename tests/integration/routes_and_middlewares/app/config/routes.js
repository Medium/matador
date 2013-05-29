function customMiddleware(req, res, next) {
  res.writeHead(301, {'Location': '/middleware-is-working'})
  res.end()
}

function postMiddleware(req, res, next) {
  res.writeHead(301, {'Location': '/post-middleware-works-too'})
  res.end()
}

module.exports = function (app) {
  return {
    '/': 'Home.index',
    '/middleware': customMiddleware,
    '/post-middleware': {
      'post': postMiddleware
    },
    '/normal': 'Home.success',
    '/post': {
      'post': 'Home.post_success'
    }
  }
}
