'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _net = require('net');

var _net2 = _interopRequireDefault(_net);

var _lodash = require('lodash');

var _api = require('./api');

var _api2 = _interopRequireDefault(_api);

var _setupConnectionsPool = require('./helpers/setupConnectionsPool');

var _setupConnectionsPool2 = _interopRequireDefault(_setupConnectionsPool);

var _setup = require('./operations/setup');

var _setup2 = _interopRequireDefault(_setup);

var _utils = require('./../../../utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function CockroachDBBackend(_settings) {
  var settings = _extends({}, defaultSettings, _settings);
  _validateSettings(settings);

  var getConnection = (0, _setupConnectionsPool2.default)(settings);

  var backend = {};

  // Public API
  function setup(done) {
    getConnection(function (err) {
      var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
          client = _ref.client,
          release = _ref.release;

      if (err) return done(err);
      (0, _setup2.default)(client).then(function () {
        return done();
      }).catch(function (err) {
        return done(err);
      }).then(function () {
        return release();
      });
    });
  }

  Object.defineProperty(backend, 'setup', { value: setup });
  Object.defineProperty(backend, 'settings', { get: function get() {
      return _extends({}, settings);
    } });
  (0, _lodash.forEach)(_api2.default, function (factory, handlerName) {
    Object.defineProperty(backend, handlerName, { value: factory(getConnection) });
  });
  return backend;
}

var defaultSettings = {
  host: 'localhost',
  port: 26257,
  database: 'eventstore',
  user: 'root',
  max: 10,
  idleTimeoutMillis: 30000
};

var iMsg = (0, _utils.prefixString)('[gRPC EventStore Backend CockroachDB]: ');
function _validateSettings(settings) {
  var host = settings.host,
      port = settings.port,
      database = settings.database,
      user = settings.user,
      max = settings.max,
      idleTimeoutMillis = settings.idleTimeoutMillis;


  if (!(0, _utils.isValidHostname)(host) && !_net2.default.isIPv4(host)) throw new TypeError(iMsg('settings.host should be a valid hostname or IPv4 address'));
  if (!(0, _utils.isPositiveInteger)(port)) throw new TypeError(iMsg('settings.port should be a positive integer'));
  if (!(0, _utils.isValidString)(database)) throw new TypeError(iMsg('settings.database should be a valid string'));
  if (!(0, _utils.isValidString)(user)) throw new TypeError(iMsg('settings.user should be a valid string'));
  if (!(0, _utils.isPositiveInteger)(max)) throw new TypeError(iMsg('settings.max should be a positive integer'));
  if (!(0, _utils.isPositiveInteger)(idleTimeoutMillis)) throw new TypeError(iMsg('settings.idleTimeoutMillis should be a positive integer'));
}

exports.default = CockroachDBBackend;