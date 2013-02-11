GG.on('all', function() { console.log(arguments); });

var $status = $('<span>');
var $el = $('<div id="golden-gate">')
  .append('<img src="' + chrome.extension.getURL('/images/ggbridge_48x48.png') + '" />')
  .append($status)
  .append($('<span>').html('_').addClass('blink'));

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
  
  socket.on('connect', function() {
    console.log('Connected to Tenderloin!');
    var parts = room.split(':');
    set_status('Claimed ' + parts[1] + '/' + parts[2]);
  });
  
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
      socket.socket.connect();
      setTimeout(do_reconnect, 2000);
    };
    do_reconnect();
  };
  
  socket.on('error', function() {
    reconnect();
  });
  
  socket.on('disconnect', function() {
    set_status('Disconnected');
    reconnect();
  });
  
  socket.on('message', function(data) {
    execute_snippet(data);
  });
};

var on_room_change = function(room, old_room) {
  if (room && room !== '') {
    disconnect();
    connect(room);
  }
}

GG.on('change:tenderloin.room', on_room_change);

GG.once('initialized', function() {
  console.log('initialized');
  on_room_change(GG.get('tenderloin.room'));
});

$('body').append($el);
set_status('Hello!');
