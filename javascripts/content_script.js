GG.on('all', function() { console.log(arguments); });

var $status = $('<span>');
var $el = $('<div id="golden-gate">')
  .append(
    $('<div>').addClass('wrapper')
      .append('<img src="' + chrome.extension.getURL('/images/ggbridge_48x48.png') + '" />')
      .append($status)
      .append($('<span>').html('_').addClass('blink'))
  );

var TYPING_TIMEOUT = 100;

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

var execute_snippet = function(snippet) {
  console.log(snippet);
  try {
    var gg = new GG.Bulkhead();
    eval(snippet);
  } catch (err) {
    console.error(err.stack);
  }
};

var disconnect = function() {
  if (GG.socket) {
    GG.socket.disconnect();
    delete GG.socket;
  }
};


var _request = io.util.request;

io.util.request = function() {
  var req = _request.apply(this, arguments);
  var _send = req.send;
  req.send = function() {
    if (req.setRequestHeader) {
      req.setRequestHeader('x-tenderloin-api-key', GG.get('tenderloin.api_key'));
    }
    _send.apply(this, arguments);
  }
  return req;
};

var timeout_id = null;

var ping = function() {
  GG.socket.emit('ping', {room: GG.get('tenderloin.room')});
};

var on_connected = function() {
  console.log('Connected to Tenderloin!');
  var room = GG.get('tenderloin.room');
  var parts = room.split(':');
  set_status('Claimed ' + parts[1] + '/' + parts[2]);
  
  ping();
  timeout_id = setInterval(ping, 2000);
};

var on_disconnected = function() {
  clearInterval(timeout_id);
  timeout_id = null;
  set_status('Disconnected');
};

var connect = function(room) {
  if (!room || room === '') { throw new Error('Must supply an room name'); }
  
  var url = GG.create_url(GG.encode(room));
  console.log('Connecting to ' + url);
  
  var socket = GG.socket = io.connect(url, {reconnect: false});
  
  ['connect', 'connecting', 'disconnect', 'connect_failed', 'error', 'message', 'anything', 'reconnect_failed', 'reconnect', 'reconnecting'].forEach(function(evt) {
    socket.on(evt, function() {
      console.log(evt);
    });
  });
  
  socket.on('connecting', function() { set_status('Connecting...'); });
  
  socket.on('connect', on_connected);
  
  var reconnecting = false;
  var reconnect = function() {
    if (reconnecting) { return; }
    reconnecting = true;
    
    var do_reconnect = function() {
      if (socket.socket.connected) {
        reconnecting = false;
        return;
      }
      console.log('Reconnecting');
      socket.socket.reconnect();
      setTimeout(do_reconnect, 2000);
    };
    do_reconnect();
  };
  
  socket.on('error', function() {
    reconnect();
  });
  
  socket.on('disconnect', function() {
    reconnect();
    on_disconnected();
  });
  
  socket.on('message', function(data) {
    execute_snippet(data);
  });
};

var on_room_change = function(room, old_room) {
  console.log('on_room_change: ' + room);
  if (room && room !== '') {
    disconnect();
    connect(room);
  }
}

var chatters = {};
var check_for_members = function() {
  $('[role="menuitem"][title$=" profile"]').toArray().forEach(function(e) {
    var name = $(e).text();
    if (!chatters[name]) {
      var $el = $(e).parents('[role="menu"]');
      chatters[name] = {
        name: name,
        el: $el
      };
      $el.append($('<div class="profile-wrapper"><img src="' + chrome.extension.getURL('/images/ggbridge_48x48.png') + '" /></div>'));
    }
  });
};

var initialize = function() {
  GG.on('change:tenderloin.room', on_room_change);
  
  on_room_change(GG.get('tenderloin.room'));
  
  setInterval(check_for_members, 5 * 1000);
};

GG.once('initialized', function() {
  if (GG.get('tenderloin.url')) {
    initialize();
  } else {
    GG.once('change:tenderloin.url', initialize);
  }
});

$('body').append($el);
set_status('Hello!');
