'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _rxjs = require('rxjs');

var _rxjs2 = _interopRequireDefault(_rxjs);

var _lodash = require('lodash');

var _utils = require('../../utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function CatchUpStoreStream(_ref) {
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
      var fromEventId = request.fromEventId;

      fromEventId = (0, _lodash.max)([0, fromEventId]);

      // Call backend
      var params = { fromEventId: fromEventId };
      var backendResults = backend.getEvents(params);
      var backendStream = (0, _utils.eventsStreamFromBackendEmitter)(backendResults);

      // Cache live events until backendStream ends
      var cachedLiveStream = new _rxjs2.default.ReplaySubject();
      var cachedLiveStreamSubscription = store.eventsStream.subscribe(function (e) {
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
      var eventsStream = backendStream.concat(cachedLiveStream, store.eventsStream);
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

exports.default = CatchUpStoreStream;