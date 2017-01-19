'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.validateAndGetBackendWriteRequest = undefined;

var _shortid = require('shortid');

var _shortid2 = _interopRequireDefault(_shortid);

var _lodash = require('lodash');

var _utils = require('../../utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function WriteToAggregateStream(_ref) {
  var backend = _ref.backend,
      store = _ref.store,
      writableStreamsRegexList = _ref.writableStreamsRegexList;

  return function (call, callback) {
    var writeRequests = void 0;
    try {
      writeRequests = [validateAndGetBackendWriteRequest({
        request: call.request,
        writableStreamsRegexList: writableStreamsRegexList
      })];
    } catch (e) {
      return callback(e);
    }

    var transactionId = (0, _shortid2.default)();

    var backendResults = backend.storeEvents({ writeRequests: writeRequests, transactionId: transactionId });

    backendResults.on('error', function (err) {
      backendResults.removeAllListeners();
      callback(err);
    });
    backendResults.on('storedEvents', function (storedEvents) {
      backendResults.removeAllListeners();
      store.publishEvents(storedEvents);
      callback(null, { events: storedEvents });
    });
  };
}

function validateAndGetBackendWriteRequest(_ref2) {
  var request = _ref2.request,
      requestIndex = _ref2.requestIndex,
      writableStreamsRegexList = _ref2.writableStreamsRegexList;

  var eMgs = (0, _utils.prefixString)(requestIndex !== undefined ? '[writing request ' + requestIndex + ']' : '');

  var stream = request.stream,
      expectedVersionNumber = request.expectedVersionNumber,
      events = request.events;

  // Validate request

  if (!(0, _utils.isValidString)(stream)) throw new TypeError(eMgs('stream MUST be a nonempty string'));
  if (!(0, _utils.isWritableStream)(stream, writableStreamsRegexList)) throw new Error(eMgs('stream is not writable'));
  if (!events || !events.length) throw new Error(eMgs('events MUST be a nonempty list of events to store'));
  if (!(0, _lodash.every)(events, function (_ref3) {
    var type = _ref3.type;
    return (0, _utils.isValidString)(type);
  })) throw new TypeError(eMgs('all events MUST have a valid type'));

  expectedVersionNumber = (0, _lodash.max)([-2, expectedVersionNumber]);

  var params = {
    stream: stream,
    events: events.map(function (e) {
      return {
        type: e.type,
        data: e.data || ''
      };
    }),
    expectedVersionNumber: expectedVersionNumber
  };
  return params;
}

exports.default = WriteToAggregateStream;
exports.validateAndGetBackendWriteRequest = validateAndGetBackendWriteRequest;