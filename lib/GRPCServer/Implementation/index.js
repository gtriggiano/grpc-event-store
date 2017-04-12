'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = RPCImplementation;

var _AppendEventsToMultipleStreams = require('./AppendEventsToMultipleStreams');

var _AppendEventsToMultipleStreams2 = _interopRequireDefault(_AppendEventsToMultipleStreams);

var _AppendEventsToStream = require('./AppendEventsToStream');

var _AppendEventsToStream2 = _interopRequireDefault(_AppendEventsToStream);

var _CatchUpWithStore = require('./CatchUpWithStore');

var _CatchUpWithStore2 = _interopRequireDefault(_CatchUpWithStore);

var _CatchUpWithStream = require('./CatchUpWithStream');

var _CatchUpWithStream2 = _interopRequireDefault(_CatchUpWithStream);

var _CatchUpWithStreamsCategory = require('./CatchUpWithStreamsCategory');

var _CatchUpWithStreamsCategory2 = _interopRequireDefault(_CatchUpWithStreamsCategory);

var _GetUniqueId = require('./GetUniqueId');

var _GetUniqueId2 = _interopRequireDefault(_GetUniqueId);

var _Ping = require('./Ping');

var _Ping2 = _interopRequireDefault(_Ping);

var _ReadStoreForward = require('./ReadStoreForward');

var _ReadStoreForward2 = _interopRequireDefault(_ReadStoreForward);

var _ReadStreamForward = require('./ReadStreamForward');

var _ReadStreamForward2 = _interopRequireDefault(_ReadStreamForward);

var _ReadStreamsCategoryForward = require('./ReadStreamsCategoryForward');

var _ReadStreamsCategoryForward2 = _interopRequireDefault(_ReadStreamsCategoryForward);

var _SubscribeToStore = require('./SubscribeToStore');

var _SubscribeToStore2 = _interopRequireDefault(_SubscribeToStore);

var _SubscribeToStream = require('./SubscribeToStream');

var _SubscribeToStream2 = _interopRequireDefault(_SubscribeToStream);

var _SubscribeToStreamsCategory = require('./SubscribeToStreamsCategory');

var _SubscribeToStreamsCategory2 = _interopRequireDefault(_SubscribeToStreamsCategory);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function RPCImplementation(config) {
  return {
    appendEventsToMultipleStreams: (0, _AppendEventsToMultipleStreams2.default)(config),
    appendEventsToStream: (0, _AppendEventsToStream2.default)(config),
    catchUpWithStore: (0, _CatchUpWithStore2.default)(config),
    catchUpWithStream: (0, _CatchUpWithStream2.default)(config),
    catchUpWithStreamsCategory: (0, _CatchUpWithStreamsCategory2.default)(config),
    getUniqueId: (0, _GetUniqueId2.default)(config),
    ping: (0, _Ping2.default)(config),
    readStoreForward: (0, _ReadStoreForward2.default)(config),
    readStreamForward: (0, _ReadStreamForward2.default)(config),
    readStreamsCategoryForward: (0, _ReadStreamsCategoryForward2.default)(config),
    subscribeToStore: (0, _SubscribeToStore2.default)(config),
    subscribeToStream: (0, _SubscribeToStream2.default)(config),
    subscribeToStreamsCategory: (0, _SubscribeToStreamsCategory2.default)(config)
  };
}