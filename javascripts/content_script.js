GG.on('all', function() { console.log(arguments); });

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
  // console.log('Connecting to ' + org + '/' + room);
  
  if (!room || room === '') { throw new Error('Must supply an room name'); }
  
  var url = GG.create_url(GG.encode(room));
  console.log('Connecting to ' + url);
  var socket = GG.socket = io.connect(url);
  
  socket.on('connect', function() {
    console.log('Connected to Tenderloin!');
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

GG.on('change:room', on_room_change);

GG.once('initialized', function() {
  console.log('initialized');
  on_room_change(GG.get('tenderloin.room'));
});
