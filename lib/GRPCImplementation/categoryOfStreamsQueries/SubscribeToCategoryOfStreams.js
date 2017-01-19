'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _utils = require('../../utils');

function SubscribeToCategoryOfStreams(_ref) {
  var store = _ref.store;

  return function (call) {
    var onClientTermination = function onClientTermination() {
      return call.end();
    };
    call.on('end', function () {
      return onClientTermination();
    });

    call.once('data', function (request) {
      var streamsCategory = request.streamsCategory;

      // Validate request

      if (!(0, _utils.isValidString)(streamsCategory)) return call.emit('error', new TypeError('streamsCategory should be a non empty string'));

      var subscription = store.eventsStream.filter(function (_ref2) {
        var stream = _ref2.stream;
        return stream.split('-')[0] === streamsCategory;
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

exports.default = SubscribeToCategoryOfStreams;