// var office_root = 'http://tenderloin-sf.herokuapp.com/';
var office_root = 'http://localhost:3000/';


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
  this.microphone_button.attr('aria-pressed').toString() === 'true';
};

Bulkhead.prototype.microphone_on = function() {
  if (!this.is_microphone_on()) {
    this.click(this.microphone_button);
  }
};

Bulkhead.prototype.is_microphone_off = function() {
  if (this.is_microphone_on()) {
    this.click(this.microphone_button);
  }
};

Bulkhead.prototype.is_camera_on = function() {
  this.camera_button.attr('aria-pressed').toString() === 'true';
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
  
  console.log(office_root + office);
  var socket = io.connect(office_root + office);
  $('body').data({socket: socket});
  
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
