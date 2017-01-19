'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _rxjs = require('rxjs');

var _rxjs2 = _interopRequireDefault(_rxjs);

var _lodash = require('lodash');

var _utils = require('../../utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function CatchUpStream(_ref) {
  var backend = _ref.backend,
      store = _ref.store;

  return function (call) {
    var onClientTermination = function onClientTermination() {
      return call.end();
    };
    call.on('end', function () {
      return onClientTermination();
    });

    call.once('data', function (request) {
      var stream = request.stream,
          fromVersionNumber = request.fromVersionNumber;

      // Validate request

      if (!(0, _utils.isValidString)(stream)) return call.emit('error', new TypeError('stream should be a non empty string'));

      fromVersionNumber = (0, _lodash.max)([0, fromVersionNumber]);

      // Call backend
      var params = { stream: stream, fromVersionNumber: fromVersionNumber };
      var backendResults = backend.getEventsByStream(params);
      var backendStream = (0, _utils.eventsStreamFromBackendEmitter)(backendResults);

      // Filter on store.eventsStream
      var liveStream = store.eventsStream.filter(function (event) {
        return event.stream === stream && event.versionNumber > fromVersionNumber;
      });

      // Cache live events until backendStream ends
      var cachedLiveStream = new _rxjs2.default.ReplaySubject();
      var cachedLiveStreamSubscription = liveStream.subscribe(function (e) {
        return cachedLiveStream.next(e);
      });
      function _endCachedLiveStream() {
        cachedLiveStreamSubscription.unsubscribe();
        cachedLiveStream.complete();
        // release memory
        process.nextTick(function () {
          return cachedLiveStream._events.splice(0);
        });
      }
      backendStream.toPromise().then(_endCachedLiveStream, _endCachedLiveStream);

      // Concat the streams and subscribe
      var eventsStream = backendStream.concat(cachedLiveStream, liveStream);
      var eventsStreamSubscription = eventsStream.subscribe(function (evt) {
        return call.write(evt);
      }, function (err) {
        return call.emit('error', err);
      });

      onClientTermination = function onClientTermination() {
        _endCachedLiveStream();
        eventsStreamSubscription.unsubscribe();
        call.end();
      };
    });
  };
}

exports.default = CatchUpStream;