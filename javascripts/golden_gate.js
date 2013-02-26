var get_nested_value = function(obj, key) {
  var current = obj;
  key.split('.').forEach(function(piece) {
    if (current) {
      current = current[piece];
    }
  });
  return current;
};

var set_nested_value = function(obj, key, value) {
  var pieces = key.split('.');
  var last = _(pieces).last();
  var current = obj;
  _(pieces).first(pieces.length - 1).forEach(function(piece) {
    if (!current[piece]) {
      current[piece] = {};
    }
    current = current[piece];
  });
  var old_value = current[last];
  current[last] = value;
  return old_value;
};

// GoldenGate

function GoldenGate() {
  this.state = {};
  _(this).extend(Backbone.Events);
}

GoldenGate.prototype.get = function(key) {
  if (key) { return get_nested_value(this.state, key); }
  return this.state;
};

GoldenGate.prototype.set = function(key, value, opts) {
  var self = this;
  var changes = [];
  
  var _set = function(prefix, obj, opts) {
    var keys = [];
    try {
      keys = _(obj).keys();
    } catch (e) {
    }
    keys.forEach(function(k) {
      var new_value = obj[k];
      var full_key = (prefix.length === 0 ? '' : prefix + '.') + k;
      if (_set(full_key, new_value, opts) === 0) {
        var old_value = set_nested_value(self.state, full_key, new_value);
        
        if (new_value !== old_value) {
          changes.push({key: full_key, new_value: new_value, old_value: old_value});
        }
      }
    });
    return keys.length;
  };
  
  var o = {};
  if (typeof(key) !== 'string') {
    o = key;
    opts = value;
  } else {
    o[key] = value;
  }
  if (!opts) { opts = {}; }
  _set('', o, opts);
  
  if (changes.length > 0) {
    changes.forEach(function(c) {
      self.trigger('change:' + c.key, c.new_value, c.old_value);
    });
    
    if (!opts.no_save) {
      this.save_state();
    }
  }
};

GoldenGate.prototype.get_state = function(callback) {
  chrome.storage.local.get('golden-gate', function(data) {
    callback(data['golden-gate']);
  });
};

GoldenGate.prototype.save_state = function(callback) {
  var o = {};
  o['golden-gate'] = this.state || {};
  chrome.storage.local.set(o, callback);
};

GoldenGate.prototype.encode = function(v) {
  return encodeURIComponent(v).replace(/\./g, '-');
};

GoldenGate.prototype.decode = function(v) {
  return decodeURIComponent(v.replace(/-/g, '.'));
};

GoldenGate.prototype.create_url = function(path) {
  if (!new RegExp('^https?://').test(path)) {
    path = this.get('tenderloin.url').replace(new RegExp('/+$'), '') + '/' + path.replace(new RegExp('^/+'), '');
  }
  return path;
};

GoldenGate.prototype.get_json = function(url, opts, callback) {
  if (typeof(opts) === 'function') {
    callback = opts;
    opts = {};
  }

  url = this.create_url(url);

  var cookie = opts.cookie || this.get('tenderloin.cookie') || '';
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
};

GoldenGate.prototype.initialize = function() {
  var self = this;
  this.get_state(function(state) {
    self.state = state || {};
    self.initialized = true;
    self.trigger('initialized');
  });
  
  chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (namespace === 'local' && changes['golden-gate']) {
      self.set(changes['golden-gate'].newValue, {no_save: true});
    }
  });
};

window.GG = new GoldenGate();

GG.on('error', function(err) { console.error(err.stack); });

$(function() {
  GG.initialize();
});
