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

  var busDNS = settings.busDNS,
      busExternalNode = settings.busExternalNode,
      busCoordinationPort = settings.busCoordinationPort,
      busExternalUpdatesPort = settings.busExternalUpdatesPort;


  var store = new _eventemitter2.default();

  // Private API
  var isExternalNode = !!busExternalNode;
  var BusNodeFactory = isExternalNode ? _dnsmqMessagebus.ExternalNode : _dnsmqMessagebus.DNSNode;
  var _bus = BusNodeFactory(busDNS, {
    coordinationPort: busCoordinationPort,
    externalUpdatesPort: busExternalUpdatesPort
  });
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
  busDNS: 'localhost',
  busExternalNode: false,
  busCoordinationPort: 50061,
  busExternalUpdatesPort: 50081
};

var iMsg = (0, _utils.prefixString)('[gRPC EventStore StoreInterface]: ');
function _validateSettings(settings) {
  var busDNS = settings.busDNS,
      busExternalNode = settings.busExternalNode,
      busCoordinationPort = settings.busCoordinationPort,
      busExternalUpdatesPort = settings.busExternalUpdatesPort;


  if (!(0, _utils.isValidString)(busDNS)) throw new TypeError(iMsg('settings.busDNS should be a valid string'));
  var isExternalNode = !!busExternalNode;
  if (!isExternalNode) {
    if (!(0, _utils.isPositiveInteger)(busCoordinationPort)) throw new TypeError(iMsg('settings.busCoordinationPort should be a positive integer'));
  }
  if (!(0, _utils.isPositiveInteger)(busExternalUpdatesPort)) throw new TypeError(iMsg('settings.busExternalUpdatesPort should be a positive integer'));
}

exports.default = StoreInterface;