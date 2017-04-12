'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = SubscribeToStreamsCategory;

var _utils = require('../../utils');

function SubscribeToStreamsCategory({
  eventsStream
}) {
  return call => {
    let onClientTermination = () => call.end();
    call.on('end', () => onClientTermination());

    call.once('data', request => {
      let streamsCategory = request.streamsCategory;

      // Validate request

      if (!(0, _utils.isNotEmptyString)(streamsCategory)) return call.emit('error', new TypeError('streamsCategory should be a non empty string'));

      let subscription = eventsStream.filter(({ stream }) => stream.split('::')[0] === streamsCategory).subscribe(event => call.write(event), err => call.emit('error', err));

      onClientTermination = () => {
        subscription.unsubscribe();
        call.end();
      };
    });
  };
}