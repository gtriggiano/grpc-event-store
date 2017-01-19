'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _lodash = require('lodash');

var _eventemitter = require('eventemitter3');

var _eventemitter2 = _interopRequireDefault(_eventemitter);

var _dnsmqMessagebus = require('dnsmq-messagebus');

var _utils = require('./utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function StoreInterface(_settings) {
  var settings = (0, _lodash.merge)({}, defaultSettings, _settings);
  _validateSettings(settings);

  var host = settings.host,
      coordinationPort = settings.coordinationPort;


  var store = new _eventemitter2.default();

  // Private API
  var _bus = (0, _dnsmqMessagebus.DNSNode)(host, { coordinationPort: coordinationPort });
  var _eventsStream = (0, _utils.eventsStreamFromBus)(_bus, 50);
  _bus.subscribe('StoredEvents');
  _bus.on('connect', function () {
    return store.emit('connect');
  });
  _bus.on('disconnect', function () {
    return store.emit('disconnect');
  });

  // Public API
  function connect() {
    _bus.connect();
  }
  function disconnect() {
    _bus.disconnect();
  }
  function publishEvents(events) {
    var eventsString = JSON.stringify((0, _lodash.isArray)(events) ? events : [events]);
    _bus.publish('StoredEvents', eventsString);
  }

  Object.defineProperty(store, 'eventsStream', { value: _eventsStream });
  Object.defineProperty(store, 'connect', { value: connect });
  Object.defineProperty(store, 'disconnect', { value: disconnect });
  Object.defineProperty(store, 'publishEvents', { value: publishEvents });
  return store;
}

var defaultSettings = {
  host: 'localhost',
  coordinationPort: 50061
};

var iMsg = (0, _utils.prefixString)('[gRPC EventStore StoreInterface]: ');
function _validateSettings(settings) {
  var host = settings.host,
      coordinationPort = settings.coordinationPort;


  if (!(0, _utils.isValidString)(host)) throw new TypeError(iMsg('settings.host should be a valid string'));
  if (!(0, _utils.isPositiveInteger)(coordinationPort)) throw new TypeError(iMsg('settings.coordinationPort should be a positive integer'));
}

exports.default = StoreInterface;