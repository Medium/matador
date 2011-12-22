module.exports = {
  compile: function compile(source, o) {
    return function () {
      return source
    }
  }
, render: function (template, o) {
    return template.replace(/{([^{}]*)}/g, function (a, b, r) {
      r = o[b]
      return typeof r === 'string' || typeof r === 'number' ? r : a
    })
  }
}