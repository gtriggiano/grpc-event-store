'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = appendEventsHOF;

var _eventemitter = require('eventemitter3');

var _eventemitter2 = _interopRequireDefault(_eventemitter);

var _lodash = require('lodash');

var _AppendEventsToStream = require('../../../GRPCServer/Implementation/AppendEventsToStream');

var _transactionWrapper = require('../helpers/transactionWrapper');

var _transactionWrapper2 = _interopRequireDefault(_transactionWrapper);

var _getStreamsVersionNumbers = require('../operations/getStreamsVersionNumbers');

var _getStreamsVersionNumbers2 = _interopRequireDefault(_getStreamsVersionNumbers);

var _appendEventsToStreams = require('../operations/appendEventsToStreams');

var _appendEventsToStreams2 = _interopRequireDefault(_appendEventsToStreams);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function appendEventsHOF(getConnection, eventsTable) {
  return ({ appendRequests, transactionId }) => {
    let dbResults = new _eventemitter2.default();

    getConnection((err, { client, release } = {}) => {
      if (err) return dbResults.emit('error', new Error(`DB_CONNECTION|${err.message}`));

      (0, _transactionWrapper2.default)(client, (client, done) => {
        let streams = appendRequests.map(({ stream }) => stream);

        (0, _getStreamsVersionNumbers2.default)({
          client,
          eventsTable,
          streams
        }).then(streamsVersionNumbers => appendRequests.map(appendRequest => processAppendRequest({
          appendRequest,
          streamVersionNumber: streamsVersionNumbers[appendRequest.stream]
        }))).then(processedAppendRequests => {
          let errors = processedAppendRequests.filter(result => result instanceof Error);
          if (errors.length) {
            throw new Error(`CONSISTENCY|${JSON.stringify(errors.map(({ stream, reason, streamVersionNumber, expectedVersionNumber }) => ({ stream, reason, streamVersionNumber, expectedVersionNumber })))}`);
          }
          return (0, _appendEventsToStreams2.default)({
            client,
            eventsTable,
            transactionId,
            eventsToAppend: (0, _lodash.flatten)(processedAppendRequests)
          });
        }).then(storedEvents => done(null, storedEvents)).catch(err => done(err));
      }, (err, storedEvents) => {
        release();
        if (err) return dbResults.emit('error', err);
        dbResults.emit('storedEvents', storedEvents);
      });
    });

    return dbResults;
  };
}

function processAppendRequest({
  appendRequest: { stream, events, expectedVersionNumber },
  streamVersionNumber
}) {
  if (expectedVersionNumber !== _AppendEventsToStream.ANY_VERSION_NUMBER) {
    let err = new Error();
    err.stream = stream;
    if (streamVersionNumber === 0 && expectedVersionNumber === _AppendEventsToStream.ANY_POSITIVE_VERSION_NUMBER) {
      err.reason = 'STREAM_DOES_NOT_EXIST';
      return err;
    }
    if (streamVersionNumber !== expectedVersionNumber) {
      err.reason = 'STREAM_VERSION_MISMATCH';
      err.streamVersionNumber = streamVersionNumber;
      err.expectedVersionNumber = expectedVersionNumber;
      return err;
    }
  }

  return events.map(({ type, data }, idx) => ({
    stream,
    type,
    data,
    versionNumber: streamVersionNumber + idx + 1
  }));
}