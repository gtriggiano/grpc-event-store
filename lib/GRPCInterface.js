'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.EventStoreProtocol = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _grpc = require('grpc');

var _grpc2 = _interopRequireDefault(_grpc);

var _eventemitter = require('eventemitter3');

var _eventemitter2 = _interopRequireDefault(_eventemitter);

var _GRPCImplementation = require('./GRPCImplementation');

var _GRPCImplementation2 = _interopRequireDefault(_GRPCImplementation);

var _utils = require('./utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var PROTOCOL_FILE_PATH = _path2.default.resolve(__dirname, '..', 'GRPCEventStore.proto');
var EventStoreProtocol = exports.EventStoreProtocol = _grpc2.default.load(PROTOCOL_FILE_PATH).grpceventstore;

function GRPCInterface(_settings) {
  var settings = _extends({}, defaultSettings, _settings);
  _validateSettings(settings);

  var grpcInstance = new _eventemitter2.default();

  // Settings
  var port = settings.port,
      credentials = settings.credentials,
      writableStreamsPatterns = settings.writableStreamsPatterns,
      backend = settings.backend,
      store = settings.store;

  // Private API

  var _connected = false;
  var _connecting = false;
  var _disconnecting = false;
  var _grpcServer = new _grpc2.default.Server();
  _grpcServer.addProtoService(EventStoreProtocol.EventStore.service, (0, _GRPCImplementation2.default)({ backend: backend, store: store, writableStreamsPatterns: writableStreamsPatterns }));

  // Public API
  function connect() {
    if (_connected || _connecting || _disconnecting) return grpcInstance;

    _connecting = true;
    _grpcServer.bind('0.0.0.0:' + port, credentials);
    _grpcServer.start();
    grpcInstance.emit('connect');
    _connected = true;
    _connecting = false;
    return grpcInstance;
  }
  function disconnect() {
    if (!_connected || _connecting || _disconnecting) return grpcInstance;

    _disconnecting = true;
    _grpcServer.tryShutdown(function () {
      _connected = false;
      _disconnecting = false;
      grpcInstance.emit('disconnect');
    });
    setTimeout(function () {
      if (!_connected) return;
      _grpcServer.forceShutdown();
      _connected = false;
      _disconnecting = false;
      grpcInstance.emit('disconnect');
    }, 500);

    return grpcInstance;
  }

  Object.defineProperty(grpcInstance, 'connect', { value: connect });
  Object.defineProperty(grpcInstance, 'disconnect', { value: disconnect });
  return grpcInstance;
}

var defaultSettings = {
  port: 50051,
  credentials: _grpc2.default.ServerCredentials.createInsecure(),
  writableStreamsPatterns: false
};

var iMsg = (0, _utils.prefixString)('[gRPC EventStore GRPCInterface]: ');
function _validateSettings(settings) {
  var port = settings.port,
      credentials = settings.credentials,
      writableStreamsPatterns = settings.writableStreamsPatterns;


  if (!(0, _utils.isPositiveInteger)(port)) throw new TypeError(iMsg('settings.port should be a positive integer'));
  if (!(credentials instanceof _grpc2.default.ServerCredentials)) throw new TypeError(iMsg('settings.credentials should be an instance of grpc.ServerCredentials'));
  if (writableStreamsPatterns && !(0, _utils.isListOfValidStrings)(writableStreamsPatterns)) throw new TypeError(iMsg('settings.writableStreamsPatterns must be either false or an array of 0 or more regex expressions'));
}

exports.default = GRPCInterface;