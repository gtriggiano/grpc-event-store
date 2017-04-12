'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = ReadStreamsCategoryForward;

var _lodash = require('lodash');

var _utils = require('../../utils');

function ReadStreamsCategoryForward({
  db
}) {
  return call => {
    call.on('error', _lodash.noop);

    var _call$request = call.request;
    let streamsCategory = _call$request.streamsCategory,
        fromEventId = _call$request.fromEventId,
        limit = _call$request.limit;

    // Validate request

    if (!(0, _utils.isNotEmptyString)(streamsCategory)) return call.emit('error', new TypeError('streamsCategory should be a non empty string'));

    fromEventId = (0, _lodash.max)([0, fromEventId]);

    let params = { streamsCategory, fromEventId };
    if (limit > 0) params.limit = limit;

    let dbResults = db.getEventsByStreamsCategory(params);
    let dbStream = (0, _utils.eventsStreamFromDbEmitter)(dbResults);
    dbStream.subscribe(event => call.write(event), err => call.emit('error', err), () => call.end());
  };
}