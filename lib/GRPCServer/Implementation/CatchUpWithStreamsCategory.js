'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = CatchUpWithStreamsCategory;

var _Rx = require('rxjs/Rx');

var _Rx2 = _interopRequireDefault(_Rx);

var _lodash = require('lodash');

var _utils = require('../../utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function CatchUpWithStreamsCategory({
  db,
  eventsStream
}) {
  return call => {
    let onClientTermination = () => call.end();
    call.on('end', () => onClientTermination());

    call.once('data', request => {
      let streamsCategory = request.streamsCategory,
          fromEventId = request.fromEventId;

      // Validate request

      if (!(0, _utils.isNotEmptyString)(streamsCategory)) return call.emit('error', new TypeError('streamsCategory should be a non empty string'));

      fromEventId = (0, _lodash.max)([0, fromEventId]);

      // Call backend
      let dbResults = db.getEventsByStreamsCategory({ streamsCategory, fromEventId });
      let dbStream = (0, _utils.eventsStreamFromDbEmitter)(dbResults);

      // Filter on eventsStream
      let liveStream = eventsStream.filter(({ id, stream }) => stream.split('::')[0] === streamsCategory && id > fromEventId);

      // Cache live events until backendStream ends
      let cachedLiveStream = new _Rx2.default.ReplaySubject();
      let cachedLiveStreamSubscription = liveStream.subscribe(e => cachedLiveStream.next(e));
      function _endCachedLiveStream() {
        cachedLiveStreamSubscription.unsubscribe();
        cachedLiveStream.complete();
        // release memory
        process.nextTick(() => cachedLiveStream._events.splice(0));
      }
      dbStream.toPromise().then(_endCachedLiveStream, _endCachedLiveStream);

      // Concat the streams and subscribe
      let finalStream = dbStream.concat(cachedLiveStream, liveStream);
      let finalStreamSubscription = finalStream.subscribe(evt => call.write(evt), err => call.emit('error', err));

      onClientTermination = () => {
        _endCachedLiveStream();
        finalStreamSubscription.unsubscribe();
        call.end();
      };
    });
  };
}