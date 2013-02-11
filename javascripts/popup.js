GG.on('all', function() { console.log(arguments); });

var fill_select = function(select, values) {
  var $select = $(select);
  values.forEach(function(v) {
    if (typeof(v) === 'string') { v = {text: v}; }
    var $item = $('<option>').html(v.text);
    if (v.value) { $item.attr('value', v.value); }
    if (v.selected) { $item.attr('selected', 'selected'); }
    $select.append($item);
  });
};

var on_logged_in = function() {
  console.log('on_logged_in');
  var self = this;
  
  var render = function(data) {
    var $el = $(GG.template('logged_in'));
    var $organization = $el.find('select.organization');
    var $room = $el.find('select.room');
    
    if (data.organizations) {
      console.log('Has organizations');
      fill_select($organization, [{text: 'Pick one', value: '---'}].concat(data.organizations.map(function(org) { return {value: org._id, text: org.name}; })));
      var org = GG.get('tenderloin.organization');
      if (org) { $organization.find('[value="' + org + '"]').attr('selected', 'selected'); }
    }
    if (data.rooms) {
      console.log('Has rooms');
      fill_select($room, [{text: 'Pick one', value: '---'}].concat(data.rooms.map(function(room) { return {value: room._id, text: room.name}; })));
      var room = GG.get('tenderloin.room');
      if (room) { $room.find('[value="' + room + '"]').attr('selected', 'selected'); }
    }
    
    $organization.on('change', function() {
      var org = $(this).val();
      $room.empty();
      if (org === '---') {
        GG.set({
          'tenderloin.organization': null,
          'tenderloin.room': null
        });
      } else {
        GG.set({
          'tenderloin.organization': org,
          'tenderloin.room': null
        });
        GG.get_json('/api/organizations/' + org + '/rooms', function(err, rooms) {
          if (err) { return console.log(err.stack); }
          fill_select($room, [{text: 'Pick one', value: '---'}].concat(rooms.map(function(room) { return {value: room._id, text: room.name}; })));
        });
      }
    });
    
    $room.on('change', function() {
      var room = $(this).val();
      if (room !== '---') {
        GG.set('tenderloin.room', room);
      }
    });
    
    $('#content').html($el);
  };
  
  async.parallel({
    organizations: function(cb) { GG.get_json('/api/organizations', cb); },
    rooms: function(cb) {
      var org = GG.get('tenderloin.organization');
      if (!org) { return cb(); }
      GG.get_json('/api/organizations/' + org + '/rooms', cb);
    }
  }, function(err, data) {
    if (err) { return console.log(err.stack); }
    render(data);
  });
};

var on_logged_out = function() {
  console.log('on_logged_out');
  $('#content').html(GG.template('login'));
};

GG.on('change:tenderloin.logged_in', function(logged_in) {
  logged_in ? on_logged_in() : on_logged_out();
});

// Check for tenderloin.url

GG.once('initialized', function() {
  GG.get('tenderloin.logged_in') ? on_logged_in() : on_logged_out();
});
