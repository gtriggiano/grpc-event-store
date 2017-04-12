'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = CatchUpWithStream;

var _Rx = require('rxjs/Rx');

var _Rx2 = _interopRequireDefault(_Rx);

var _lodash = require('lodash');

var _utils = require('../../utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function CatchUpWithStream({
  db,
  eventsStream
}) {
  return call => {
    let onClientTermination = () => call.end();
    call.on('end', () => onClientTermination());

    call.once('data', request => {
      let stream = request.stream,
          fromVersionNumber = request.fromVersionNumber;

      // Validate request

      if (!(0, _utils.isNotEmptyString)(stream)) return call.emit('error', new TypeError('stream should be a non empty string'));

      fromVersionNumber = (0, _lodash.max)([0, fromVersionNumber]);

      // Call backend
      let params = { stream, fromVersionNumber };
      let dbResults = db.getEventsByStream(params);
      let dbStream = (0, _utils.eventsStreamFromDbEmitter)(dbResults);

      // Filter on store.eventsStream
      let liveStream = eventsStream.filter(event => event.stream === stream && event.versionNumber > fromVersionNumber);

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