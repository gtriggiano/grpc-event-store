'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = ReadStoreForward;

var _lodash = require('lodash');

var _utils = require('../../utils');

function ReadStoreForward({
  db
}) {
  return call => {
    call.on('error', _lodash.noop);

    var _call$request = call.request;
    let fromEventId = _call$request.fromEventId,
        limit = _call$request.limit;


    fromEventId = (0, _lodash.max)([0, fromEventId]);

    let params = { fromEventId };
    if (limit > 0) params.limit = limit;

    let dbResults = db.getEvents(params);
    let dbStream = (0, _utils.eventsStreamFromDbEmitter)(dbResults);
    dbStream.subscribe(event => call.write(event), err => call.emit('error', err), () => call.end());
  };
}