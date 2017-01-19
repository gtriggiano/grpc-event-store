'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
function SubscribeToStoreStream(_ref) {
  var store = _ref.store;

  return function (call) {
    var onClientTermination = function onClientTermination() {
      return call.end();
    };
    call.on('end', function () {
      return onClientTermination();
    });

    call.once('data', function () {
      var subscription = store.eventsStream.subscribe(function (evt) {
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

exports.default = SubscribeToStoreStream;