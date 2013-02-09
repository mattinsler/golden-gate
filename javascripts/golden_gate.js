window.golden_gate = window.GG = {
  tenderloin_url: 'http://tenderloin.localhost.dev',
  // tenderloin_url: 'http://tenderloin-sf.herokuapp.com',
  
  get_json: function(url, opts, callback) {
    if (typeof(opts) === 'function') {
      callback = opts;
      opts = {};
    }

    if (!new RegExp('^https?://').test(url)) {
      url = this.tenderloin_url.replace(new RegExp('/+$'), '') + '/' + url.replace(new RegExp('^/+'), '');
    }

    var cookie = opts.cookie || this.tenderloin_cookie || '';
    var data = opts.data || {};

    return $.ajax({
      dataType: 'json',
      url: url,
      data: data,
      beforeSend: function(req) {
        req.setRequestHeader('x-tenderloin-auth', cookie);
      },
      error: function(jsxhr, status, error) {
        callback(error);
      },
      success: function(data, status, jsxhr) {
        callback(null, data);
      }
    });
  },
  
  is_logged_in: function(callback) {
    if (!this.getting_cookie) { return callback((this.tenderloin_cookie)); }
    
    var self = this;
    var check = function() {
      if (self.getting_cookie) { return setTimeout(check, 50); }
      callback((self.tenderloin_cookie));
    }
    check();
  }
};

GG.getting_cookie = true;
chrome.cookies.get({url: GG.tenderloin_url, name: 'connect.sid'}, function(cookie) {
  if (cookie && cookie.value) {
    GG.get_json('/api/rooms', {cookie: cookie.value}, function(e) {
      if (!e) {
        GG.tenderloin_cookie = cookie.value;
      }
      GG.getting_cookie = false;
    });
  } else {
    GG.getting_cookie = false;
  }
});

chrome.cookies.onChanged.addListener(function(change) {
  console.log('cookies.onChanged');
  console.log(change);
});
