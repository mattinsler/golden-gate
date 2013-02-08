var mouse_event = function(name, target) {
  var evt = document.createEvent('MouseEvents');
  evt.initMouseEvent(name, true, true, document.defaultView, 0, 0, 0, 0, 0, false, false, false, false, 0, target);
  target.dispatchEvent(evt);
};

var click = function(button) {
  ['mouseover', 'mousedown', 'mouseup', 'mouseout'].forEach(function(evt) {
    mouse_event(evt, button);
  });
};

var check_for_prompt = function() {
  $('div[role="button"]').toArray().filter(function(button) {
    return $(button).html().indexOf('Yes') >= 0;
  }).forEach(function(button) {
    click(button);
  });
};

$(function() {
  setInterval(check_for_prompt, 15 * 1000);
});