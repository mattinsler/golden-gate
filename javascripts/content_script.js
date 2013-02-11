GG.on('all', function() { console.log(arguments); });

var execute_snippet = function(snippet) {
  console.log(snippet);
  try {
    var gg = new GG.Bulkhead();
    eval(snippet);
  } catch (e) {
    console.error(e);
  }
};

var disconnect = function() {
  if (GG.socket) {
    GG.socket.disconnect();
    delete GG.socket;
  }
};

var connect = function(org, room) {
  console.log('Connecting to ' + org + '/' + room);
  
  if (!org || org === '') { throw new Error('Must supply an org name'); }
  if (!room || room === '') { throw new Error('Must supply an room name'); }

  var socket = GG.socket = io.connect(GG.tenderloin.url + '/organizations/' + org + '/rooms/' + room);
  
  socket.on('connect', function() {
    console.log('Connected to Tenderloin!');
  });
  
  socket.on('message', function(data) {
    execute_snippet(data);
  });
};

var on_room_change = function(room, old_room) {
  var org = GG.get('tenderloin.organization');
  if (org && org !== '' && room && room !== '') {
    disconnect();
    connect(org, room);
  }
}

GG.on('change:room', on_room_change);

GG.once('initialized', function() {
  on_room_change(GG.get('tenderloin.room'));
});
