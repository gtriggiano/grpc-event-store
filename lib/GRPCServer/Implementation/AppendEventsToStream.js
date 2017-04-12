'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.StreamVersionMismatchError = exports.StreamDoesNotExistError = exports.ANY_POSITIVE_VERSION_NUMBER = exports.ANY_VERSION_NUMBER = undefined;
exports.default = AppendEventsToStream;
exports.validateAndGetDbAppendRequest = validateAndGetDbAppendRequest;

var _shortid = require('shortid');

var _shortid2 = _interopRequireDefault(_shortid);

var _lodash = require('lodash');

var _utils = require('../../utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const ANY_VERSION_NUMBER = exports.ANY_VERSION_NUMBER = -2;
const ANY_POSITIVE_VERSION_NUMBER = exports.ANY_POSITIVE_VERSION_NUMBER = -1;

const StreamDoesNotExistError = exports.StreamDoesNotExistError = (0, _utils.defineError)('StreamDoesNotExistError', 'STREAM_DOES_NOT_EXIST');
const StreamVersionMismatchError = exports.StreamVersionMismatchError = (0, _utils.defineError)('StreamVersionMismatchError', 'STREAM_VERSION_MISMATCH');

function AppendEventsToStream({
  db,
  eventsStream,
  onEventsStored,
  isStreamWritable
}) {
  return (call, callback) => {
    let appendRequests;
    try {
      appendRequests = [validateAndGetDbAppendRequest({
        request: call.request,
        isStreamWritable
      })];
    } catch (e) {
      return callback(e);
    }

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

function validateAndGetDbAppendRequest({
  request,
  requestIndex,
  isStreamWritable
}) {
  let prefix = (0, _utils.prefixedString)(requestIndex !== undefined ? `[writing request ${requestIndex}]` : '');
  let stream = request.stream,
      expectedVersionNumber = request.expectedVersionNumber,
      events = request.events;

  // Validate request

  if (!(0, _utils.isNotEmptyString)(stream)) throw new TypeError(prefix('stream MUST be a nonempty string'));
  // TODO: check that `::` is present 0/1 times in a stream name
  if (!isStreamWritable(stream)) throw new Error(prefix(`stream '${stream}' is not writable`));
  if (!events || !events.length) throw new Error(prefix('events MUST be a nonempty list of events to store'));
  if (!(0, _lodash.every)(events, ({ type }) => (0, _utils.isNotEmptyString)(type))) throw new TypeError(prefix('all events MUST have a valid type'));

  expectedVersionNumber = (0, _lodash.max)([-2, expectedVersionNumber]);

  let appendRequest = {
    stream,
    events: events.map(e => ({
      type: e.type,
      data: e.data || ''
    })),
    expectedVersionNumber
  };
  return appendRequest;
}