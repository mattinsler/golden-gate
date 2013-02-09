var fill_rooms = function(err, rooms) {
  if (err || !rooms) { return; }
  $('select').html('<option></option>' + rooms.map(function(room) {
    return '<option value="' + room + '">' + room + '</option>';
  }).join(''));
}

var template = function(name) {
  return $('#templates [name="' + name + '"]').html();
}

var on_logged_in = function() {
  var claim = function(room) {
    $('#status').html('You have claimed: ' + room);
  };
  
  $('#content').html(template('logged_in'));
  GG.get_json('/api/rooms', fill_rooms);
  
  chrome.storage.local.get('room', function(data) {
    if (data.room) {
      claim(data.room);
    }
  });
  
  $('select').on('change', function() {
    var room = $(this).val();
    if (room !== '') {
      chrome.storage.local.set({room: room});
      claim(room);
    }
  });
};

var on_logged_out = function() {
  $('#content').html(template('login'));
};


$(function() {
  GG.is_logged_in(function(logged_in) {
    console.log(logged_in);
    if (logged_in) {
      on_logged_in();
    } else {
      on_logged_out();
    }
  });
});
