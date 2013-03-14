var mouse_event = function(name, target) {
  var evt = document.createEvent('MouseEvents');
  evt.initMouseEvent(name, true, true, document.defaultView, 0, 0, 0, 0, 0, false, false, false, false, 0, target);
  target.dispatchEvent(evt);
};

// Bulkhead

var Bulkhead = GG.Bulkhead = function() {
  this.microphone_button = $('[role="button"][aria-label*="microphone"]');
  this.camera_button = $('[role="button"][aria-label*="camera"]');
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
  if (!GG.sounds) { GG.sounds = {}; }
  
  if (!is_url_rx.test(filename)) {
    filename = GG.create_url('/sounds/' + filename);
  }
  var sound = new buzz.sound(filename);
  var current = GG.sounds.current_sound;
  
  if (current) {
    current.fadeOut(2000, function() {
      GG.sounds.current_sound = sound;
      sound.play();
    });
  } else {
    GG.sounds.current_sound = sound;
    sound.play();
  }
  
  sound.bind('ended', function() {
    delete GG.sounds.current_sound;
  });
};

Bulkhead.prototype.stop_sound = function() {
  if (GG.sounds && GG.sounds.current_sound) {
    GG.sounds.current_sound.fadeOut(2000);
    delete GG.sounds.current_sound;
  }
}

// Bulkhead: End
