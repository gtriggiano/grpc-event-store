'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports.default = EventStoreNode;

var _grpc = require('grpc');

var _grpc2 = _interopRequireDefault(_grpc);

var _eventemitter = require('eventemitter3');

var _eventemitter2 = _interopRequireDefault(_eventemitter);

var _GRPCServer = require('./GRPCServer');

var _GRPCServer2 = _interopRequireDefault(_GRPCServer);

var _SimpleStoreBus = require('./SimpleStoreBus');

var _SimpleStoreBus2 = _interopRequireDefault(_SimpleStoreBus);

var _utils = require('./utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function EventStoreNode(config) {
  let node = new _eventemitter2.default();

  let _config = _extends({}, defaultConfig, config);
  validateConfig(_config);
  let port = _config.port,
      credentials = _config.credentials,
      dbAdapter = _config.dbAdapter,
      storeBus = _config.storeBus,
      writableStreamsPatterns = _config.writableStreamsPatterns;


  let _grpcServer = null;
  let _stopping = false;

  let eventsStream = (0, _utils.eventsStreamFromStoreBus)(storeBus);
  let onEventsStored = events => {
    let eventsString = JSON.stringify(events);
    storeBus.publish(eventsString);
  };
  let isStreamWritable = (0, _utils.stringMatchesSomeRegex)(writableStreamsPatterns.map(str => new RegExp(str)));

  return Object.defineProperties(node, {
    start: { value: () => {
        if (_grpcServer) return node;
        _grpcServer = (0, _GRPCServer2.default)({
          port,
          credentials,
          eventsStream,
          onEventsStored,
          isStreamWritable,
          db: dbAdapter
        });
        node.emit('start');
        return node;
      } },
    stop: { value: () => {
        if (!_grpcServer || _stopping) return node;
        _stopping = true;
        _grpcServer.tryShutdown(() => {
          _stopping = false;
          _grpcServer = null;
          node.emit('stop');
        });
        setTimeout(() => {
          if (!_grpcServer) return;
          _grpcServer.forceShutdown();
        }, 2000);
        return node;
      } },
    server: { get: () => _grpcServer }
  });
}

const defaultConfig = {
  port: 50051,
  credentials: _grpc2.default.ServerCredentials.createInsecure(),
  storeBus: (0, _SimpleStoreBus2.default)(),
  writableStreamsPatterns: null
};

const prefix = (0, _utils.prefixedString)('[grpc Event Store] ');
const validateConfig = ({
  port,
  credentials,
  storeBus,
  dbAdapter,
  writableStreamsPatterns
}) => {
  if (!(0, _utils.isPositiveInteger)(port)) throw new TypeError(prefix(`config.port MUST be a positive integer. Received ${port}`));
  if (!(0, _utils.areValidGRPCCredentials)(credentials)) throw new TypeError(prefix('config.credentials MUST be a valid grpc server credentials object'));
  if (!(0, _utils.hasStoreBusInterface)(storeBus)) throw new TypeError(prefix(`the provided config.storeBus does not have the expected interface`));
  if (!dbAdapter) throw new TypeError(prefix('you MUST provide a dbAdapter to the EventStoreNode constructor'));
  if (!(0, _utils.hasDbAdapterInterface)(dbAdapter)) throw new TypeError(prefix('config.dbAdapter does not provide the expected interface'));
  if (writableStreamsPatterns && !(0, _utils.isArrayOfNotEmptyStrings)(writableStreamsPatterns)) throw new TypeError(prefix('config.writableStreamsPatterns MUST be either falsy or an array of 0 or more strings'));
};