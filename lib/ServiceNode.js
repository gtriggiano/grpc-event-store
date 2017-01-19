'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _lodash = require('lodash');

var _eventemitter = require('eventemitter3');

var _eventemitter2 = _interopRequireDefault(_eventemitter);

var _BackendInterface = require('./BackendInterface');

var _BackendInterface2 = _interopRequireDefault(_BackendInterface);

var _GRPCInterface = require('./GRPCInterface');

var _GRPCInterface2 = _interopRequireDefault(_GRPCInterface);

var _StoreInterface = require('./StoreInterface');

var _StoreInterface2 = _interopRequireDefault(_StoreInterface);

var _utils = require('./utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function ServiceNode(_settings) {
  var settings = _extends({}, defaultSettings, _settings);
  _validateSettings(settings);

  var node = new _eventemitter2.default();

  var host = settings.host,
      port = settings.port,
      coordinationPort = settings.coordinationPort,
      backendSetupTimeout = settings.backendSetupTimeout,
      credentials = settings.credentials,
      backend = settings.backend;

  // Private API

  var _connected = false;
  var _connecting = false;
  var _disconnecting = false;
  var _backend = (0, _BackendInterface2.default)(backend || {});
  var _backendSetupTimeout = (0, _utils.timeoutCallback)(backendSetupTimeout, iMsg('Backend setup timeout.'));
  var _store = (0, _StoreInterface2.default)({ host: host, coordinationPort: coordinationPort });
  var _grpcServer = (0, _GRPCInterface2.default)(_extends({
    backend: _backend,
    store: _store
  }, port ? { port: port } : {}, credentials ? { credentials: credentials } : {}));

  // Public api
  function connect() {
    if (_connected || _connecting || _disconnecting) return node;
    _connecting = true;

    _backend.setup(_backendSetupTimeout(function (err) {
      if (err) {
        _connecting = false;
        node.emit('error', err);
        console.error(err);
        return;
      }
      _store.once('connect', function () {
        return _grpcServer.connect();
      });
      _grpcServer.once('connect', function () {
        _connected = true;
        _connecting = false;
        node.emit('connect');
      });
      _store.connect();
    }));
    return node;
  }
  function disconnect() {
    if (!_connected || _connecting || _disconnecting) return node;
    _disconnecting = true;

    _grpcServer.once('disconnect', function () {
      return _store.disconnect();
    });
    _store.once('disconnect', function () {
      _connected = false;
      _disconnecting = true;
      node.emit('disconnect');
    });
    _grpcServer.disconnect();
    return node;
  }

  Object.defineProperty(node, 'connect', { value: connect });
  Object.defineProperty(node, 'disconnect', { value: disconnect });
  return node;
}

var defaultSettings = {
  host: 'localhost',
  coordinationPort: 50061,
  backendSetupTimeout: 1000
  /*
  port
  credentials
  backend
  */
};

var iMsg = (0, _utils.prefixString)('[gRPC EventStore ServiceNode]: ');
function _validateSettings(settings) {
  var backendSetupTimeout = settings.backendSetupTimeout;


  if (!(0, _lodash.isInteger)(backendSetupTimeout) || backendSetupTimeout < 1) throw new TypeError(iMsg('settings.setupTimeout should be a positive integer'));
  if (backendSetupTimeout < 500) console.warn(iMsg('a value of less than 500 msec for settings.backendSetupTimeout could affect the right functioning of the EventStore backend'));
}

ServiceNode.customBackend = _BackendInterface2.default.customBackend;

exports.default = ServiceNode;