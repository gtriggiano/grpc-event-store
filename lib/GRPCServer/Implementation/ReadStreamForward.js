'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = ReadStreamForward;

var _lodash = require('lodash');

var _utils = require('../../utils');

function ReadStreamForward({
  db
}) {
  return call => {
    call.on('error', _lodash.noop);

    var _call$request = call.request;
    let stream = _call$request.stream,
        fromVersionNumber = _call$request.fromVersionNumber,
        limit = _call$request.limit;

    // Validate request

    if (!(0, _utils.isNotEmptyString)(stream)) return call.emit('error', new TypeError('stream should be a non empty string'));

    fromVersionNumber = (0, _lodash.max)([0, fromVersionNumber]);

    let params = { stream, fromVersionNumber };
    if (limit > 0) params.limit = limit;

    let dbResults = db.getEventsByStream(params);
    let dbStream = (0, _utils.eventsStreamFromDbEmitter)(dbResults);
    dbStream.subscribe(event => call.write(event), err => call.emit('error', err), () => call.end());
  };
}