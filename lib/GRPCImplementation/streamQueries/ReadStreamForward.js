'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _lodash = require('lodash');

var _utils = require('../../utils');

function ReadStreamForward(_ref) {
  var backend = _ref.backend;

  return function (call) {
    call.on('error', _lodash.noop);

    var _call$request = call.request,
        stream = _call$request.stream,
        fromVersionNumber = _call$request.fromVersionNumber,
        limit = _call$request.limit;

    // Validate request

    if (!(0, _utils.isValidString)(stream)) return call.emit('error', new TypeError('stream should be a non empty string'));

    fromVersionNumber = (0, _lodash.max)([0, fromVersionNumber]);

    var params = { stream: stream, fromVersionNumber: fromVersionNumber };
    if (limit > 0) params.limit = limit;

    var backendResults = backend.getEventsByStream(params);
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

exports.default = ReadStreamForward;