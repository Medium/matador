var PathMatcher = require('../src/pathmatcher');

exports.testPathMatcher = function(test) {
  var pm = new PathMatcher();
  pm.add('/', 'root');
  pm.add('/about/', 'about');
  pm.add('/:user/', 'user');
  pm.add('/:user/profile/', 'user-profile');
  pm.add('/tags/:tag/list/:page/', 'tag-list');
  pm.add('/dir/*', 'dir');
  pm.add('/dir/tools/', 'dir-tools');
  pm.add('/dir/tools/*', 'dir-tools-wc');
  pm.add('/dir/tools/:tool/', 'dir-screw');

  test.throws(function() { pm.add('/dir/*/dir/'); }, Error,
      '* should not be allowed in the middle of a pattern.');

  test.throws(function() { pm.add('/:test/'); }, Error,
      'Ambiguous patterns should throw.');

  assertMatch(test, pm, '/', 'root');
  assertMatch(test, pm, '/about/', 'about');
  assertMatch(test, pm, '/macgyver/', 'user', {user: 'macgyver'});
  assertMatch(test, pm, '/macgyver/profile/', 'user-profile', {user: 'macgyver'});
  assertMatch(test, pm, '/tags/monkeys/list/2/', 'tag-list', {tag: 'monkeys', page: '2'});
  assertMatch(test, pm, '/dir/foo/', 'dir', {'*': ['foo']});
  assertMatch(test, pm, '/dir/foo/bar/', 'dir', {'*': ['foo', 'bar']});
  assertMatch(test, pm, '/dir/foo/bar/baz/', 'dir', {'*': ['foo', 'bar', 'baz']});
  assertMatch(test, pm, '/dir/tools/', 'dir-tools');
  assertMatch(test, pm, '/dir/tools/screwdriver/', 'dir-screw', {'tool': 'screwdriver'});
  assertMatch(test, pm, '/dir/tools/screwdriver/xxx/', 'dir-tools-wc', {'*': ['screwdriver', 'xxx']});

  // Wildcards only match if there's anything to match the '*' so this
  // doesn't match anything.
  test.ok(pm.getMatch('/dir/') == null);

  // No wildcards.
  test.ok(pm.getMatch('/about/what/') == null);

  test.equals(null, pm.getMatch('/foo/bar/'));

  test.done();
};


exports.testRegExpPathMatching = function(test) {
  var pm = new PathMatcher();
  pm.add('/@re1:one|two|three/', 'regexp1');
  pm.add('/@re2:aaa|bbb', 'regexp2');
  pm.add('/@re2:aaa|bbb/kkk', 'regexp3');

  pm.add('/@twittername:@.*', 'regexp4');


  assertMatch(test, pm, '/one/', 'regexp1', {'re1': 'one'});
  assertMatch(test, pm, '/two/', 'regexp1', {'re1': 'two'});
  assertMatch(test, pm, '/three/', 'regexp1', {'re1': 'three'});

  assertMatch(test, pm, '/aaa/', 'regexp2', {'re2': 'aaa'});
  assertMatch(test, pm, '/bbb/', 'regexp2', {'re2': 'bbb'});

  assertMatch(test, pm, '/aaa/kkk/', 'regexp3', {'re2': 'aaa'});
  assertMatch(test, pm, '/bbb/kkk/', 'regexp3', {'re2': 'bbb'});

  assertMatch(test, pm, '/@dpup', 'regexp4', {'twittername': '@dpup'});

  test.equals(null, pm.getMatch('/four/'));

  test.done();
};


exports.testDisambiguation = function(test) {
  var pm = new PathMatcher();
  pm.add('/one/', 'one');
  pm.add('/:two/', 'two');
  pm.add('/@three:(xxx|yyy)', 'three');
  pm.add('/*', 'four');

  assertMatch(test, pm, '/one/', 'one', {});
  assertMatch(test, pm, '/two/', 'two', {'two': 'two'});
  assertMatch(test, pm, '/zzz/', 'two', {'two': 'zzz'});
  assertMatch(test, pm, '/xxx/', 'three', {'three': 'xxx'});
  assertMatch(test, pm, '/yyy/', 'three', {'three': 'yyy'});
  assertMatch(test, pm, '/two/four/', 'four', {'*': ['two', 'four']});
  test.done();
};


exports.testWildcardFallback = function(test) {
  var pm = new PathMatcher();
  pm.add('/foo/bar/baz/', 'one')
  pm.add('/foo/*', 'two')

  assertMatch(test, pm, '/foo/xxx/', 'two', {'*': ['xxx']});
  assertMatch(test, pm, '/foo/bar/', 'two', {'*': ['bar']});
  assertMatch(test, pm, '/foo/bar/baz/', 'one', {});
  assertMatch(test, pm, '/foo/bar/baz/bam/', 'two', {'*': ['bar', 'baz', 'bam']});
  test.done();
};


exports.testNestedWildcards = function(test) {
  var pm = new PathMatcher();
  pm.add('/foo/bar/baz/', 'one')
  pm.add('/foo/*', 'two')
  pm.add('/*', 'three')

  assertMatch(test, pm, '/foo/xxx/', 'two', {'*': ['xxx']});
  assertMatch(test, pm, '/foo/bar/', 'two', {'*': ['bar']});
  assertMatch(test, pm, '/foo/bar/baz/', 'one', {});
  assertMatch(test, pm, '/foo/bar/baz/bam/', 'two', {'*': ['bar', 'baz', 'bam']});
  assertMatch(test, pm, '/xxx/', 'three', {'*': ['xxx']});
  assertMatch(test, pm, '/yyy/', 'three', {'*': ['yyy']});

  test.done();
};

/*
 * This test doesn't pass because pathmatcher does no back tracking.
 *
exports.testRegExpClash = function(test) {
  var pm = new PathMatcher();
  pm.add('/one/a/', 'a');
  pm.add('/@re:(one|two)/b', 'b');

  assertMatch(test, pm, '/one/a', 'a', {});
  assertMatch(test, pm, '/one/b', 'b', {'re': 'one'});
  assertMatch(test, pm, '/two/b', 'b', {'re': 'two'});

  test.done();
};*/


function assertMatch(test, pm, path, expected, matches) {
  var node = pm.getMatch(path);
  test.ok(node, 'No node found for ' + path);
  test.equals(node.object, expected);
  test.deepEqual(node.matches, matches || []);
}
