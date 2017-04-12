'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = AppendEventsToMultipleStreams;

var _shortid = require('shortid');

var _shortid2 = _interopRequireDefault(_shortid);

var _lodash = require('lodash');

var _AppendEventsToStream = require('./AppendEventsToStream');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function AppendEventsToMultipleStreams({
  db,
  eventsStream,
  onEventsStored,
  isStreamWritable
}) {
  return (call, callback) => {
    let appendRequests = call.request.appendRequests;


    if (!appendRequests.length) return callback(new Error('appendRequests should be a list of event storage requests'));

    try {
      appendRequests = appendRequests.map((request, requestIndex) => (0, _AppendEventsToStream.validateAndGetDbAppendRequest)({
        request,
        requestIndex,
        isStreamWritable
      }));
    } catch (e) {
      return callback(e);
    }

    // Check that there is just one request for every stream
    let involvedStreams = (0, _lodash.uniq)(appendRequests.map(({ stream }) => stream));
    if (involvedStreams.length < appendRequests.length) return callback(new Error('each writeRequest should concern a different stream'));

    let transactionId = (0, _shortid2.default)();

    let dbResults = db.appendEvents({ appendRequests, transactionId });

    function onError(err) {
      cleanListeners();
      callback(err);
    }
    function onStoredEvents(storedEvents) {
      cleanListeners();
      onEventsStored(storedEvents);
      callback(null, { events: storedEvents });
    }
    function cleanListeners() {
      dbResults.removeListener('error', onError);
      dbResults.removeListener('storedEvents', onStoredEvents);
    }

    dbResults.on('error', onError);
    dbResults.on('storedEvents', onStoredEvents);
  };
}