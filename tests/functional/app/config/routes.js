module.exports = function (app) {
  return {
    '/': 'Home.index',
    '/wildcard/*': 'Home.wildcard',
    '/name/:name': 'Home.name'
  }
}
