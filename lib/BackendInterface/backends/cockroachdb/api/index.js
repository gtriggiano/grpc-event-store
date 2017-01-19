'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _getEvents = require('./getEvents');

var _getEvents2 = _interopRequireDefault(_getEvents);

var _getEventsByStream = require('./getEventsByStream');

var _getEventsByStream2 = _interopRequireDefault(_getEventsByStream);

var _getEventsByStreamCategory = require('./getEventsByStreamCategory');

var _getEventsByStreamCategory2 = _interopRequireDefault(_getEventsByStreamCategory);

var _storeEvents = require('./storeEvents');

var _storeEvents2 = _interopRequireDefault(_storeEvents);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var apiHandlersFactories = {
  getEvents: _getEvents2.default,
  getEventsByStream: _getEventsByStream2.default,
  getEventsByStreamCategory: _getEventsByStreamCategory2.default,
  storeEvents: _storeEvents2.default
};

exports.default = apiHandlersFactories;