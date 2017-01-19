'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _shortid = require('shortid');

var _shortid2 = _interopRequireDefault(_shortid);

var _lodash = require('lodash');

var _WriteToStream = require('./WriteToStream');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function WriteToMultipleStreams(_ref) {
  var backend = _ref.backend,
      store = _ref.store,
      writableStreamsRegexList = _ref.writableStreamsRegexList;

  return function (call, callback) {
    var writeRequests = call.request.writeRequests;


    if (!writeRequests.length) return callback(new Error('writeRequests should be a list of event storage requests'));

    try {
      writeRequests = writeRequests.map(function (request, requestIndex) {
        return (0, _WriteToStream.validateAndGetBackendWriteRequest)({
          request: request,
          requestIndex: requestIndex,
          writableStreamsRegexList: writableStreamsRegexList
        });
      });
    } catch (e) {
      return callback(e);
    }

    // Check that there is just one request for every aggregate
    var involvedStreams = (0, _lodash.uniq)(writeRequests.map(function (_ref2) {
      var stream = _ref2.stream;
      return stream;
    }));
    if (involvedStreams.length < writeRequests.length) return callback(new Error('each writeRequest should concern a different stream'));

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

exports.default = WriteToMultipleStreams;