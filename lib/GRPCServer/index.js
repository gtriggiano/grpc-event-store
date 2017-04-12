'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = GRPCServer;

var _grpc = require('grpc');

var _grpc2 = _interopRequireDefault(_grpc);

var _Protocol = require('../Protocol');

var _Implementation = require('./Implementation');

var _Implementation2 = _interopRequireDefault(_Implementation);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function GRPCServer({
  port,
  credentials,
  eventsStream,
  onEventsStored,
  db,
  isStreamWritable
}) {
  let server = new _grpc2.default.Server();
  server.addProtoService((0, _Protocol.getProtocol)().EventStore.service, (0, _Implementation2.default)({
    db,
    eventsStream,
    onEventsStored,
    isStreamWritable
  }));
  server.bind(`0.0.0.0:${port}`, credentials);
  server.start();
  return server;
}