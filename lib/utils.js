'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.defineError = exports.eventsStreamFromStoreBus = exports.eventsStreamFromDbEmitter = exports.zeropad = exports.stringMatchesSomeRegex = exports.hasStoreBusInterface = exports.hasDbAdapterInterface = exports.areValidGRPCCredentials = exports.isArrayOfNotEmptyStrings = exports.isPositiveInteger = exports.isNotEmptyString = exports.prefixedString = undefined;

var _util = require('util');

var _util2 = _interopRequireDefault(_util);

var _Rx = require('rxjs/Rx');

var _Rx2 = _interopRequireDefault(_Rx);

var _grpc = require('grpc');

var _grpc2 = _interopRequireDefault(_grpc);

var _lodash = require('lodash');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const prefixedString = exports.prefixedString = (0, _lodash.curry)((prefix, str) => `${prefix}${str}`);

const isNotEmptyString = exports.isNotEmptyString = str => (0, _lodash.isString)(str) && !(0, _lodash.isEmpty)(str);

const isPositiveInteger = exports.isPositiveInteger = n => (0, _lodash.isInteger)(n) && n > 0;

const isArrayOfNotEmptyStrings = exports.isArrayOfNotEmptyStrings = arr => (0, _lodash.isArray)(arr) && (0, _lodash.every)(arr, isNotEmptyString);

const areValidGRPCCredentials = exports.areValidGRPCCredentials = credentials => credentials instanceof _grpc2.default.ServerCredentials;

const hasDbAdapterInterface = exports.hasDbAdapterInterface = dbAdapter => (0, _lodash.isObject)(dbAdapter) && (0, _lodash.isFunction)(dbAdapter.getEvents) && (0, _lodash.isFunction)(dbAdapter.getEventsByStream) && (0, _lodash.isFunction)(dbAdapter.getEventsByStreamsCategory) && (0, _lodash.isFunction)(dbAdapter.appendEvents);

const hasStoreBusInterface = exports.hasStoreBusInterface = storeBus => (0, _lodash.isObject)(storeBus) && (0, _lodash.isFunction)(storeBus.on) && (0, _lodash.isFunction)(storeBus.publish) && (!storeBus.safeOrderTimeframe || (0, _lodash.isInteger)(storeBus.safeOrderTimeframe) && storeBus.safeOrderTimeframe > 0);

const stringMatchesSomeRegex = exports.stringMatchesSomeRegex = (0, _lodash.curry)((regexList, str) => {
  if (!regexList || (0, _lodash.isEmpty)(regexList)) return true;
  return (0, _lodash.some)(regexList, regex => regex.test(str));
});

const zeropad = exports.zeropad = (i, minLength) => {
  let str = String(i);
  let diff = Math.max(minLength - str.length, 0);
  let pad = (0, _lodash.range)(diff).map(() => 0).join('');
  return `${pad}${str}`;
};

const eventsStreamFromDbEmitter = exports.eventsStreamFromDbEmitter = dbEmitter => {
  let eventsStream = _Rx2.default.Observable.fromEvent(dbEmitter, 'event');
  let errorsStream = _Rx2.default.Observable.fromEvent(dbEmitter, 'error').flatMap(e => _Rx2.default.Observable.throw(e));
  let endStream = _Rx2.default.Observable.fromEvent(dbEmitter, 'end');

  return eventsStream.merge(errorsStream).takeUntil(endStream);
};

const eventsStreamFromStoreBus = exports.eventsStreamFromStoreBus = storeBus => {
  let receivedEvents = { ids: [], byId: {} };

  function pushEvent(evt) {
    let id = zeropad(evt.id, 25);
    receivedEvents.ids.push(id);
    receivedEvents.ids.sort();
    receivedEvents.byId[id] = evt;
    return true;
  }
  function unshiftOldestEvent() {
    let eventId = receivedEvents.ids.shift();
    let evt = receivedEvents.byId[eventId];
    delete receivedEvents.byId[eventId];
    return evt;
  }

  let eventsStream = _Rx2.default.Observable.fromEvent(storeBus, 'newEvents').map(payload => JSON.parse(payload)).flatMap(events => _Rx2.default.Observable.from(events)).map(pushEvent);

  if (storeBus.safeOrderTimeframe) {
    eventsStream = eventsStream.delay(storeBus.safeOrderTimeframe);
  }

  eventsStream = eventsStream.map(unshiftOldestEvent).publish();

  eventsStream.connect();

  return eventsStream;
};

const defineError = exports.defineError = (errorName, errorMessage) => {
  function CustomError() {
    Error.captureStackTrace(this, this.constructor);
    this.name = errorName;
    this.message = errorMessage;
  }

  _util2.default.inherits(CustomError, Error);
  Object.defineProperty(CustomError, 'name', { value: `${errorName}` });
  return CustomError;
};