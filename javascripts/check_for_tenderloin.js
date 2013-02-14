var check = function() {
  if ($('meta[name="tenderloin"][content="you know you like it"]').length === 0) { return; }
  
  var url = 'http://' + window.location.host;
  
  var collected = _(GG.get('tenderloin.collected') || {}).invert();
  collected[url] = 1;
  GG.set('tenderloin.collected', _(collected).keys());
  
  if (!GG.get('tenderloin.url')) {
    GG.set('tenderloin.url', url);
  }
};

GG.once('initialized', function() {
  check();
});
