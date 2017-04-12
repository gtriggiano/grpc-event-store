'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = SubscribeToStream;

var _utils = require('../../utils');

function SubscribeToStream({
  eventsStream
}) {
  return call => {
    let onClientTermination = () => call.end();
    call.on('end', () => onClientTermination());

    call.once('data', request => {
      let stream = request.stream;

      // Validate request

      if (!(0, _utils.isNotEmptyString)(stream)) return call.emit('error', new TypeError('stream should be a non empty string'));

      let subscription = eventsStream.filter(event => event.stream === stream).subscribe(event => call.write(event), err => call.emit('error', err));

      onClientTermination = () => {
        subscription.unsubscribe();
        call.end();
      };
    });
  };
}