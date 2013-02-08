var office_root = 'http://tenderloin-sf.herokuapp.com/';
// var office_root = 'http://localhost:3000/';

golden_gate = window.golden_gate = {};

// Bulkhead

var Bulkhead = function() {
  this.microphone_button = $('[role="button"][aria-label^="Microphone"]');
  this.camera_button = $('[role="button"][aria-label^="Camera"]');
};

Bulkhead.prototype.click = function(button) {
  if (button instanceof jQuery) {
    button = button[0];
  }
  
  ['mouseover', 'mousedown', 'mouseup', 'mouseout'].forEach(function(evt) {
    mouse_event(evt, button);
  });
};

Bulkhead.prototype.is_microphone_on = function() {
  return (this.microphone_button.attr('aria-pressed').toString() === 'false');
};

Bulkhead.prototype.microphone_on = function() {
  if (!this.is_microphone_on()) {
    this.click(this.microphone_button);
  }
};

Bulkhead.prototype.microphone_off = function() {
  if (this.is_microphone_on()) {
    this.click(this.microphone_button);
  }
};

Bulkhead.prototype.is_camera_on = function() {
  return (this.camera_button.attr('aria-pressed').toString() === 'false');
};

Bulkhead.prototype.camera_on = function() {
  if (!this.is_camera_on()) {
    this.click(this.camera_button);
  }
};

Bulkhead.prototype.camera_off = function() {
  if (this.is_camera_on()) {
    this.click(this.camera_button);
  }
};

var is_url_rx = new RegExp('^https?://');

Bulkhead.prototype.play_sound = function(filename) {
  if (!golden_gate.sounds) { golden_gate.sounds = {}; }
  
  if (!is_url_rx.test(filename)) {
    filename = office_root + 'sounds/' + filename;
  }
  var sound = new buzz.sound(filename);
  var current = golden_gate.sounds.current_sound;
  
  if (current) {
    current.fadeOut(2000, function() {
      golden_gate.sounds.current_sound = sound;
      sound.play();
    });
  } else {
    golden_gate.sounds.current_sound = sound;
    sound.play();
  }
  
  sound.bind('ended', function() {
    delete golden_gate.sounds.current_sound;
  });
};

Bulkhead.prototype.stop_sound = function() {
  if (golden_gate.sounds && golden_gate.sounds.current_sound) {
    golden_gate.sounds.current_sound.fadeOut(2000);
    delete golden_gate.sounds.current_sound;
  }
}

// Bulkhead: End

var mouse_event = function(name, target) {
  var evt = document.createEvent('MouseEvents');
  evt.initMouseEvent(name, true, true, document.defaultView, 0, 0, 0, 0, 0, false, false, false, false, 0, target);
  target.dispatchEvent(evt);
};

var execute_snippet = function(snippet) {
  console.log(snippet);
  try {
    var bulkhead = new Bulkhead();
    eval(snippet);
  } catch (e) {
    console.error(e);
  }
};


var connect = function(office) {
  console.log('Connecting to ' + office);
  
  if (!office || office === '') { throw new Error('Must supply an office name'); }
  
  if (golden_gate.socket) {
    golden_gate.socket.disconnect();
    golden_gate.socket = null;
  }
  
  var socket = golden_gate.socket = io.connect(office_root + office);
  
  socket.on('connect', function() {
    console.log('Connected to Tenderloin!');
  });
  
  socket.on('message', function(data) {
    execute_snippet(data);
  });
};


chrome.storage.onChanged.addListener(function(changes, namespace) {
  for (k in changes) {
    if (k === 'office') {
      connect(changes[k].newValue);
    }
  }
});

chrome.storage.local.get('office', function(data) {
  if (data.office) {
    connect(data.office);
  }
});
