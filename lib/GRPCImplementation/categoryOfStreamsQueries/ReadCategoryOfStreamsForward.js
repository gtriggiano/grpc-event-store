'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _lodash = require('lodash');

var _utils = require('../../utils');

function ReadCategoryOfStreamsForward(_ref) {
  var backend = _ref.backend;

  return function (call) {
    call.on('error', _lodash.noop);

    var _call$request = call.request,
        streamsCategory = _call$request.streamsCategory,
        fromEventId = _call$request.fromEventId,
        limit = _call$request.limit;

    // Validate request

    if (!(0, _utils.isValidString)(streamsCategory)) return call.emit('error', new TypeError('streamsCategory should be a non empty string'));

    fromEventId = (0, _lodash.max)([0, fromEventId]);

    var params = { streamsCategory: streamsCategory, fromEventId: fromEventId };
    if (limit > 0) params.limit = limit;

    var backendResults = backend.getEventsByStreamCategory(params);
    var eventsStream = (0, _utils.eventsStreamFromBackendEmitter)(backendResults);
    eventsStream.subscribe(function (evt) {
      return call.write(evt);
    }, function (err) {
      return call.emit('error', err);
    }, function () {
      return call.end();
    });
  };
}

exports.default = ReadCategoryOfStreamsForward;