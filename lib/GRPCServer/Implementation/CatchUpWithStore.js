'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = CatchUpWithStore;

var _Rx = require('rxjs/Rx');

var _Rx2 = _interopRequireDefault(_Rx);

var _lodash = require('lodash');

var _utils = require('../../utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function CatchUpWithStore({
  db,
  eventsStream
}) {
  return call => {
    let onClientTermination = () => call.end();
    call.on('end', () => onClientTermination());

    call.once('data', request => {
      let fromEventId = request.fromEventId;

      fromEventId = (0, _lodash.max)([0, fromEventId]);

      // Call backend
      let params = { fromEventId };
      let dbResults = db.getEvents(params);
      let dbStream = (0, _utils.eventsStreamFromDbEmitter)(dbResults);

      // Cache live events until backendStream ends
      let cachedLiveStream = new _Rx2.default.ReplaySubject();
      let cachedLiveStreamSubscription = eventsStream.subscribe(e => cachedLiveStream.next(e));
      function _endCachedLiveStream() {
        cachedLiveStreamSubscription.unsubscribe();
        cachedLiveStream.complete();

        // release memory
        process.nextTick(() => cachedLiveStream._events.splice(0));
      }
      dbStream.toPromise().then(_endCachedLiveStream, _endCachedLiveStream);

      // Concat the streams and subscribe
      let finalStream = dbStream.concat(cachedLiveStream, eventsStream);
      let finalStreamSubscription = finalStream.subscribe(evt => call.write(evt), err => call.emit('error', err));

      onClientTermination = () => {
        _endCachedLiveStream();
        finalStreamSubscription.unsubscribe();
        call.end();
      };
    });
  };
}