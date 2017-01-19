'use strict';

var _ServiceNode = require('./ServiceNode');

var _ServiceNode2 = _interopRequireDefault(_ServiceNode);

var _GRPCInterface = require('./GRPCInterface');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var lib = {};
Object.defineProperties(lib, {
  ServiceNode: { enumerable: true, value: _ServiceNode2.default },
  EventStoreProtocol: { enumerable: true, value: _GRPCInterface.EventStoreProtocol }
});

module.exports = lib;