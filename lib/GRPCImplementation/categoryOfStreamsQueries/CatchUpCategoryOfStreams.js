'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _rxjs = require('rxjs');

var _rxjs2 = _interopRequireDefault(_rxjs);

var _lodash = require('lodash');

var _utils = require('../../utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function CatchUpCategoryOfStreams(_ref) {
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
      var streamsCategory = request.streamsCategory,
          fromEventId = request.fromEventId;

      // Validate request

      if (!(0, _utils.isValidString)(streamsCategory)) return call.emit('error', new TypeError('streamsCategory should be a non empty string'));

      fromEventId = (0, _lodash.max)([0, fromEventId]);

      // Call backend
      var backendResults = backend.getEventsByStreamCategory({ streamsCategory: streamsCategory, fromEventId: fromEventId });
      var backendStream = (0, _utils.eventsStreamFromBackendEmitter)(backendResults);

      // Filter on store.eventsStream
      var liveStream = store.eventsStream.filter(function (_ref2) {
        var id = _ref2.id,
            stream = _ref2.stream;
        return stream.split('-')[0] === streamsCategory && id > fromEventId;
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

exports.default = CatchUpCategoryOfStreams;