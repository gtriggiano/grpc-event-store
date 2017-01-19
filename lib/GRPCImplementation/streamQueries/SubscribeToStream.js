'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _utils = require('../../utils');

function SubscribeToStream(_ref) {
  var store = _ref.store;

  return function (call) {
    var onClientTermination = function onClientTermination() {
      return call.end();
    };
    call.on('end', function () {
      return onClientTermination();
    });

    call.once('data', function (request) {
      var stream = request.stream;

      // Validate request

      if (!(0, _utils.isValidString)(stream)) return call.emit('error', new TypeError('stream should be a non empty string'));

      var subscription = store.eventsStream.filter(function (event) {
        return event.stream === stream;
      }).subscribe(function (evt) {
        return call.write(evt);
      }, function (err) {
        return call.emit('error', err);
      });

      onClientTermination = function onClientTermination() {
        subscription.unsubscribe();
        call.end();
      };
    });
  };
}

exports.default = SubscribeToStream;