var fs = require('fs')
!(function partialRenderer(partialRenderer) {
  partialRenderer.build = function (path) {
    var partials = {}
      , startPath = ''
    function go(path) {
      if (!startPath) startPath = path
      fs.readdirSync(path).forEach(function (item) {
        var pathAndItem = [path, item].join('/')
          , stat = fs.statSync(pathAndItem)
        if (stat.isDirectory()) {
          go(pathAndItem)
          if (item == 'partials') {
            fs.readdirSync(pathAndItem).forEach(function (item) {
              var location = [path.replace(startPath, ''), '/'].join('')
                , partialName = item.replace(/\.html$/, '')
                , partialContent = fs.readFileSync([path, 'partials', item].join('/'), 'utf8')
                , obj = {}
              obj[partialName] = partialContent
              if (!partials[location]) partials[location] = {}
              partials[location][partialName] = partialContent
            })
          }
        }
      })
    }
    go(path)
    return partials
  }
  partialRenderer.get = function (viewFolder, allPartials) {
    viewFolder = ['/', viewFolder.replace(/\/$/, '')].join('')
    var dirs = viewFolder.split('/')
      , viewPartials = allPartials
      , partials = {}
    function buildPartials(arr, i, dir) {
      if (!i) i = 0
      if (!dir) dir = ''
      if (arr[i] != '') arr[i] = [arr[i], '/'].join('')
      v(partials).extend(allPartials[['/', arr[i], dir].join('')])
      if (arr[i + 1]) buildPartials(arr, i + 1, arr[i])
    }
    buildPartials(dirs)
    return partials
  }
})(typeof exports !== 'undefined' ? exports : partialRenderer)