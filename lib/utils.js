'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.eventsStreamFromBackendEmitter = exports.eventsStreamFromBus = exports.zeropad = exports.isWritableStream = exports.isListOfValidStrings = exports.isPositiveInteger = exports.isValidHostname = exports.isValidString = exports.timeoutCallback = exports.prefixString = undefined;

var _lodash = require('lodash');

var _rxjs = require('rxjs');

var _rxjs2 = _interopRequireDefault(_rxjs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var validHostnameRegex = /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/;

var prefixString = exports.prefixString = (0, _lodash.curry)(function (prefix, str) {
  return '' + prefix + str;
});

var timeoutCallback = exports.timeoutCallback = (0, _lodash.curry)(function (timeout, msg, cb) {
  var _called = false;
  var _invoke = function _invoke() {
    if (_called) return;
    _called = true;
    cb.apply(undefined, arguments);
  };
  setTimeout(function () {
    _invoke(new Error(msg));
  }, timeout);
  return _invoke;
});

var isValidString = exports.isValidString = function isValidString(str) {
  return (0, _lodash.isString)(str) && !!str.length;
};

var isValidHostname = exports.isValidHostname = function isValidHostname(str) {
  return (0, _lodash.isString)(str) && validHostnameRegex.test(str);
};

var isPositiveInteger = exports.isPositiveInteger = function isPositiveInteger(n) {
  return (0, _lodash.isInteger)(n) && n > 0;
};

var isListOfValidStrings = exports.isListOfValidStrings = function isListOfValidStrings(list) {
  return (0, _lodash.isArray)(list) && (0, _lodash.every)(list, isValidString);
};

var isWritableStream = exports.isWritableStream = function isWritableStream(stream, writableStreamsRegexList) {
  if (!writableStreamsRegexList || !writableStreamsRegexList.length) return true;

  return (0, _lodash.some)(writableStreamsRegexList, function (regex) {
    return regex.test(stream);
  });
};

var zeropad = exports.zeropad = function zeropad(i, minLength) {
  var str = String(i);
  var diff = minLength - str.length;
  if (diff > 0) {
    str = '' + (0, _lodash.range)(diff).map(function () {
      return 0;
    }).join('') + str;
  }
  return str;
};

var eventsStreamFromBus = exports.eventsStreamFromBus = function eventsStreamFromBus(bus) {
  var delayTime = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 100;

  var receivedEvents = {
    ids: [],
    byId: {}
  };

  // We create an hot observable through the publish().connect() sequence
  var stream = _rxjs2.default.Observable.fromEvent(bus, 'StoredEvents').map(function (msg) {
    return JSON.parse(msg);
  }).flatMap(function (events) {
    return _rxjs2.default.Observable.from(events);
  }).map(function (evt) {
    var evtId = zeropad(evt.id, 25);
    receivedEvents.ids.push(evtId);
    receivedEvents.ids.sort();
    receivedEvents.byId[evtId] = evt;
    return receivedEvents;
  }).delay(delayTime).map(function (evt) {
    var oldestEventId = receivedEvents.ids.shift();
    var oldestEvent = receivedEvents.byId[oldestEventId];
    delete receivedEvents.byId[oldestEventId];
    return oldestEvent;
  }).publish();

  stream.connect(); // TODO: should we take a reference to this subscription to end it later?

  return stream;
};

var eventsStreamFromBackendEmitter = exports.eventsStreamFromBackendEmitter = function eventsStreamFromBackendEmitter(e) {
  var evt = _rxjs2.default.Observable.fromEvent(e, 'event');
  var error = _rxjs2.default.Observable.fromEvent(e, 'error').flatMap(function (err) {
    return _rxjs2.default.Observable.throw(err);
  });
  var end = _rxjs2.default.Observable.fromEvent(e, 'end');

  return evt.merge(error).takeUntil(end);
};