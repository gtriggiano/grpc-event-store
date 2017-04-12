'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = SimpleStoreBus;

var _eventemitter = require('eventemitter3');

var _eventemitter2 = _interopRequireDefault(_eventemitter);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function SimpleStoreBus() {
  let bus = new _eventemitter2.default();
  bus.publish = eventsString => {
    bus.emit('newEvents', eventsString);
  };
  bus.safeOrderTimeframe = null;
  return bus;
}