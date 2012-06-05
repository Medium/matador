module.exports = function (app) {
  return {
    root: [
      ['get', '/', 'Home'],
      ['get', '/soy', 'Soy']
    ]
  }
}