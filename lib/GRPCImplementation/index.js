'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _Ping = require('./Ping');

var _Ping2 = _interopRequireDefault(_Ping);

var _GetUid = require('./GetUid');

var _GetUid2 = _interopRequireDefault(_GetUid);

var _CatchUpCategoryOfStreams = require('./categoryOfStreamsQueries/CatchUpCategoryOfStreams');

var _CatchUpCategoryOfStreams2 = _interopRequireDefault(_CatchUpCategoryOfStreams);

var _ReadCategoryOfStreamsForward = require('./categoryOfStreamsQueries/ReadCategoryOfStreamsForward');

var _ReadCategoryOfStreamsForward2 = _interopRequireDefault(_ReadCategoryOfStreamsForward);

var _SubscribeToCategoryOfStreams = require('./categoryOfStreamsQueries/SubscribeToCategoryOfStreams');

var _SubscribeToCategoryOfStreams2 = _interopRequireDefault(_SubscribeToCategoryOfStreams);

var _CatchUpStoreStream = require('./storeQueries/CatchUpStoreStream');

var _CatchUpStoreStream2 = _interopRequireDefault(_CatchUpStoreStream);

var _ReadStoreStreamForward = require('./storeQueries/ReadStoreStreamForward');

var _ReadStoreStreamForward2 = _interopRequireDefault(_ReadStoreStreamForward);

var _SubscribeToStoreStream = require('./storeQueries/SubscribeToStoreStream');

var _SubscribeToStoreStream2 = _interopRequireDefault(_SubscribeToStoreStream);

var _CatchUpStream = require('./streamQueries/CatchUpStream');

var _CatchUpStream2 = _interopRequireDefault(_CatchUpStream);

var _ReadStreamForward = require('./streamQueries/ReadStreamForward');

var _ReadStreamForward2 = _interopRequireDefault(_ReadStreamForward);

var _SubscribeToStream = require('./streamQueries/SubscribeToStream');

var _SubscribeToStream2 = _interopRequireDefault(_SubscribeToStream);

var _WriteToStream = require('./writeProcedures/WriteToStream');

var _WriteToStream2 = _interopRequireDefault(_WriteToStream);

var _WriteToMultipleStreams = require('./writeProcedures/WriteToMultipleStreams');

var _WriteToMultipleStreams2 = _interopRequireDefault(_WriteToMultipleStreams);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Write Procedures


// Store queries
function GRPCImplementationFactory(_ref) {
  var backend = _ref.backend,
      store = _ref.store,
      writableStreamsPatterns = _ref.writableStreamsPatterns;

  var writableStreamsRegexList = writableStreamsPatterns ? writableStreamsPatterns.map(function (str) {
    return new RegExp(str);
  }) : false;
  var settings = { backend: backend, store: store, writableStreamsRegexList: writableStreamsRegexList };
  return {
    ping: (0, _Ping2.default)(settings),
    getUid: (0, _GetUid2.default)(settings),

    // Category of streams queries
    catchUpCategoryOfStreams: (0, _CatchUpCategoryOfStreams2.default)(settings),
    readCategoryOfStreamsForward: (0, _ReadCategoryOfStreamsForward2.default)(settings),
    subscribeToCategoryOfStreams: (0, _SubscribeToCategoryOfStreams2.default)(settings),

    // Store queries
    catchUpStoreStream: (0, _CatchUpStoreStream2.default)(settings),
    readStoreStreamForward: (0, _ReadStoreStreamForward2.default)(settings),
    subscribeToStoreStream: (0, _SubscribeToStoreStream2.default)(settings),

    // Stream queries
    catchUpStream: (0, _CatchUpStream2.default)(settings),
    readStreamForward: (0, _ReadStreamForward2.default)(settings),
    subscribeToStream: (0, _SubscribeToStream2.default)(settings),

    // Write Procedures
    writeToStream: (0, _WriteToStream2.default)(settings),
    writeToMultipleStreams: (0, _WriteToMultipleStreams2.default)(settings)
  };
}

// Stream queries


// Category of streams queries
exports.default = GRPCImplementationFactory;