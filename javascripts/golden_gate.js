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

window.golden_gate = window.GG = {
  state: {},

  template: function(name) {
    return $('#templates [name="' + name + '"]').html();
  },
  
  get: function(key) {
    if (key) { return get_nested_value(this.state, key); }
    return this.state;
  },
  
  set: function(key, value, opts) {
    var self = this;
    var changed = false;
    
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
            changed = true;
            self.trigger('change:' + full_key, new_value, old_value);
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
    
    if (changed && !opts.no_save) {
      this.save_state();
    }
  },
  
  get_state: function(callback) {
    chrome.storage.local.get('golden-gate', function(data) {
      callback(data['golden-gate']);
    });
  },
  
  save_state: function(callback) {
    var o = {};
    o['golden-gate'] = this.state || {};
    chrome.storage.local.set(o, callback);
  },
  
  get_json: function(url, opts, callback) {
    if (typeof(opts) === 'function') {
      callback = opts;
      opts = {};
    }

    if (!new RegExp('^https?://').test(url)) {
      url = this.get('tenderloin.url').replace(new RegExp('/+$'), '') + '/' + url.replace(new RegExp('^/+'), '');
    }

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
  },
  
  initialize: function() {
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
  }
};
_(GG).extend(Backbone.Events);

GG.on('error', function(err) { console.error(err.stack); });

GG.initialize();
