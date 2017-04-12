'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getProtocol = exports.PROTOCOL_FILE_PATH = undefined;

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _grpc = require('grpc');

var _grpc2 = _interopRequireDefault(_grpc);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const PROTOCOL_FILE_PATH = exports.PROTOCOL_FILE_PATH = _path2.default.resolve(__dirname, '..', 'GRPCEventStore.proto');

const getProtocol = exports.getProtocol = () => _grpc2.default.load(PROTOCOL_FILE_PATH).grpceventstore;