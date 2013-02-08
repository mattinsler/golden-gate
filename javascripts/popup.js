// var office_root = 'http://tenderloin-sf.herokuapp.com/';
var office_root = 'http://localhost:3000/';



var login = function(office) {
  $('#status').html('Logged in as ' + office);
};

var fill_offices = function(offices) {
  $('select').html('<option></option>' + offices.map(function(office) {
    return '<option value="' + office + '">' + office + '</option>';
  }).join(''));
}

$(function() {
  $.getJSON(office_root + 'api/offices', fill_offices);
  
  $('select').on('change', function() {
    var office = $(this).val();
    if (office !== '') {
      chrome.storage.local.set({office: office});
      login(office);
    }
  });
  
  chrome.storage.local.get('office', function(data) {
    if (data.office) {
      login(data.office);
    }
  });
});
