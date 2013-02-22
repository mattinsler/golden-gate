GG.on('all', function() { console.log(arguments); });

var _template_cache = {};
var template = function(name) {
  return _template_cache[name] || '';
};

$(function() {
  _template_cache = _($('#templates [name]').toArray()).inject(function(o, tpl) {
    o[$(tpl).attr('name')] = $(tpl).html();
    return o;
  }, {});
});


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
    var $el = $(template('logged-in'));
    var $organization = $el.find('select.organization');
    var $room = $el.find('select.room');
    
    if (data.organizations) {
      fill_select($organization, [{text: 'Pick one', value: '---'}].concat(data.organizations.map(function(org) { return {value: org._id + '---' + org.api_key, text: org.name}; })));
      var org = GG.get('tenderloin.organization');
      if (org) { $organization.find('[value^="' + org + '---"]').attr('selected', 'selected'); }
    }
    if (data.rooms) {
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
        var parts = org.split('---');
        org = parts[0];
        var api_key = parts[1];
        GG.set({
          'tenderloin.organization': org,
          'tenderloin.api_key': api_key,
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
  $('#content').html(template('login'));
  $('#content a.btn').attr('href', GG.get('tenderloin.url'));
};

GG.on('change:tenderloin.logged_in', function(logged_in) {
  logged_in ? on_logged_in() : on_logged_out();
});

GG.once('initialized', function() {
  if (!GG.get('tenderloin.url')) {
    $('#content').html(template('no-tenderloin-url'));
  } else {
    $('#server').html(GG.get('tenderloin.url').replace(/^(https?:\/\/| *)/g, '').replace(/[ \/].*/, ''));
    GG.get('tenderloin.logged_in') ? on_logged_in() : on_logged_out();
  }
});
