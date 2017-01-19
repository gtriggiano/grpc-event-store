'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CustomBackendWrapper = undefined;

var _lodash = require('lodash');

var _backends = require('./backends');

var _backends2 = _interopRequireDefault(_backends);

var _utils = require('../utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var availableBackends = Object.keys(_backends2.default);

function BackendInterface(_settings) {
  var customBackendInstance = _settings instanceof CustomBackendWrapper;
  if (customBackendInstance) return _settings.backend;

  var settings = (0, _lodash.merge)({}, defaultSettings, _settings);
  _validateSettings(settings);

  var type = settings.type;


  return _backends2.default[type](settings);
}

var defaultSettings = {
  type: 'cockroachdb',
  host: 'localhost',
  port: 26257,
  database: 'eventstore',
  user: 'root'
};

var iMsg = (0, _utils.prefixString)('[gRPC EventStore BackendInterface]: ');
function _validateSettings(settings) {
  var type = settings.type;

  if (!(0, _utils.isValidString)(type)) throw new TypeError(iMsg('settings.host should be a valid string'));
  if (!~availableBackends.indexOf(type)) throw new Error(iMsg('"' + type + '" backend type is not supported.'));
}

function CustomBackendWrapper(backendInstance) {
  this.backend = backendInstance;
}
function wrapCustomBackendInstance(backendInstance) {
  return new CustomBackendWrapper(backendInstance);
}
BackendInterface.customBackend = wrapCustomBackendInstance;

exports.default = BackendInterface;
exports.CustomBackendWrapper = CustomBackendWrapper;