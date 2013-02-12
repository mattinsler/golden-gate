GG.on('all', function() { console.log(arguments); });

var validate_cookie = function(cookie, callback) {
  GG.get_json('/api/user', {cookie: cookie}, function(err) {
    if (err) { return callback(false); }
    callback(true);
  });
};

var get_cookie = function(callback) {
  var url = GG.get('tenderloin.url');
  if (!url) { return callback(); }
  chrome.cookies.get({url: url, name: 'connect.sid'}, function(cookie) {
    if (!cookie || !cookie.value) { return callback(); }
    callback(cookie.value);
  });
};

var on_cookie_change = function(cookie) {
  if (!cookie) { return GG.set({'tenderloin.cookie': null, 'tenderloin.logged_in': false}); }
  
  validate_cookie(cookie, function(valid) {
    if (valid) { return GG.set({'tenderloin.cookie': cookie, 'tenderloin.logged_in': true}); }
    GG.set({'tenderloin.cookie': null, 'tenderloin.logged_in': false});
  });
};

var cookie_change_listener = function(change) {
  var url = GG.get('tenderloin.url');
  if (!url) { return; }
  var match = new RegExp('https?://([^\/]+)').exec(url);
  if (!match) { return; }
  var domain = match[1];
  
  if (change.cookie.domain !== domain || change.cookie.path !== '/') { return; }
  
  change.removed ? on_cookie_change() : on_cookie_change(change.cookie.value);
};

var initialize = function() {
  chrome.cookies.onChanged.addListener(cookie_change_listener);
  
  var cookie = GG.get('tenderloin.cookie');
  cookie ? on_cookie_change(cookie) : get_cookie(on_cookie_change);
};

GG.once('initialized', function() {
  if (GG.get('tenderloin.url')) {
    initialize();
  } else {
    GG.once('change:tenderloin.url', initialize);
  }
});
