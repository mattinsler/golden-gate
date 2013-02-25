GG.on('all', function() { console.log(arguments); });

var TYPING_TIMEOUT = 75;

var clear_status = function(callback) {
  var text = $status.text();
  var idx = text.length;
  var step = function() {
    if (idx < 0) { return callback(); }
    
    $status.html(text.slice(0, idx--));
    setTimeout(step, TYPING_TIMEOUT);
  };
  step();
};

var type_status = function(text, callback) {
  var idx = 0;
  var step = function() {
    if (idx > text.length) { return callback(); }
    
    $status.html(text.slice(0, idx++));
    setTimeout(step, TYPING_TIMEOUT);
  };
  step();
};

var status_queue = [];
var processing_queue = false;
var set_status = function(text) {
  status_queue.push(text);
  
  if (processing_queue) { return; }
  processing_queue = true;
  
  var process_queue = function() {
    var status = status_queue.shift();
    if (!status) {
      processing_queue = false;
      return;
    }
    
    clear_status(function() {
      type_status(status, function() {
        setTimeout(process_queue, TYPING_TIMEOUT);
      });
    });
  };
  
  process_queue();
};

// var chatters = {};
// var check_for_members = function() {
//   $('[role="menuitem"][title$=" profile"]').toArray().forEach(function(e) {
//     var name = $(e).text();
//     if (!chatters[name]) {
//       var $el = $(e).parents('[role="menu"]');
//       chatters[name] = {
//         name: name,
//         el: $el
//       };
//       $el.append($('<div class="profile-wrapper"><img src="' + chrome.extension.getURL('/images/ggbridge_48x48.png') + '" /></div>'));
//     }
//   });
// };








var State = function State() {
  var _request = io.util.request;

  io.util.request = function() {
    var req = _request.apply(this, arguments);
    // if (!GG.get('tenderloin.api_key')) { return req; }
    
    var _send = req.send;
    req.send = function() {
      if (req.setRequestHeader) {
        req.setRequestHeader('x-tenderloin-api-key', GG.get('tenderloin.api_key'));
      }
      _send.apply(this, arguments);
    }
    return req;
  };
};

State.prototype.initialize = function() {
  GG.on('change:tenderloin.api_key', this.on_tenderloin_api_key_change, this);
  GG.on('change:tenderloin.room', this.on_tenderloin_room_change, this);
  GG.on('change:tenderloin.url', this.on_tenderloin_url_change, this);
  
  this.check_is_ready_to_connect();
  
  this.ping_interval = setInterval(this.ping.bind(this), 2000);
};

State.prototype.attach_events = function(socket) {
  console.log('ATTACH EVENTS');
  ['connect', 'connecting', 'disconnect', 'connect_failed', 'error', 'message', 'anything', 'reconnect_failed', 'reconnect', 'reconnecting'].forEach(function(evt) {
    socket.on(evt, function() {
      console.log(evt);
    });
  });
  
  socket.on('connecting', function() { set_status('Connecting...'); });
  socket.on('connect', this.on_connected.bind(this));
  socket.on('error', this.on_error.bind(this));
  socket.on('connect_failed', this.on_connect_failed.bind(this));
  socket.on('disconnect', this.on_disconnected.bind(this));
  socket.on('message', this.execute_snippet.bind(this));
};

State.prototype.execute_snippet = function(snippet) {
  console.log(snippet);
  try {
    var gg = new GG.Bulkhead();
    eval(snippet);
  } catch (err) {
    console.error(err.stack);
  }
};

State.prototype.on_error = function() {
  this.connected = false;
  
  var self = this;
  setTimeout(function() {
    self.socket.socket.reconnect();
  }, 2000);
};

State.prototype.on_connect_failed = function() {
  this.connected = false;
  
  var self = this;
  setTimeout(function() {
    // self.socket.socket.reconnect();
  }, 2000);
};

State.prototype.connect = function() {
  var url = GG.create_url(GG.encode(GG.get('tenderloin.room')));
  console.log('Connecting to ' + url);
  
  this.socket = io.connect(url, {
    reconnect: true,
    'reconnection limit': 2000,
    'max reconnection attempts': Infinity,
    'force new connection': true
  });
  this.attach_events(this.socket);
};

State.prototype.ping = function() {
  if (this.connected) {
    this.socket.emit('ping', {room: GG.get('tenderloin.room')});
  }
};

State.prototype.disconnect = function(callback) {
  if (!this.socket) { return callback && callback(); }
  
  var self = this;
  this.socket.once('disconnect', function() {
    self.socket.removeAllListeners();
    delete self.socket;
    callback && callback();
  });
  
  this.socket.disconnect();
};

State.prototype.on_connected = function() {
  this.connected = true;
  
  set_status('Connected');
  console.log('Connected to Tenderloin!');
    
  var room = GG.get('tenderloin.room');
  var parts = room.split(':');
  set_status('Claimed ' + parts[1] + '/' + parts[2]);
};

State.prototype.on_disconnected = function() {
  this.connected = false;
  console.log('on disconnected');
  set_status('Disconnected');
};

State.prototype.on_tenderloin_api_key_change = function(new_value, old_value) {
  this.check_is_ready_to_connect();
};

State.prototype.on_tenderloin_room_change = function(new_value, old_value) {
  var self = this;
  this.disconnect(function() {
    self.check_is_ready_to_connect();
  });
};

State.prototype.on_tenderloin_url_change = function(new_value, old_value) {
  var self = this;
  this.disconnect(function() {
    self.check_is_ready_to_connect();
  });
};

State.prototype.check_is_ready_to_connect = function() {
  if (this.is_ready_to_connect()) {
    this.connect();
  }
};

State.prototype.is_ready_to_connect = function() {
  var data = GG.get('tenderloin');
  return (data.url && data.api_key && data.room);
};

var state = new State();
GG.once('initialized', state.initialize, state);

var $status = $('<span>');
var $el = $('<div id="golden-gate">')
  .append(
    $('<div>').addClass('wrapper')
      .append('<img src="' + chrome.extension.getURL('/images/ggbridge_48x48.png') + '" />')
      .append($status)
      .append($('<span>').html('_').addClass('blink'))
  );

$('body').append($el);

set_status('Hello!');
