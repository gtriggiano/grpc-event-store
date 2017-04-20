'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _immutable = require('immutable');

var _eventemitter = require('eventemitter3');

var _eventemitter2 = _interopRequireDefault(_eventemitter);

var _lodash = require('lodash');

var _utils = require('../../utils');

var _AppendEventsToStream = require('../../GRPCServer/Implementation/AppendEventsToStream');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function InMemoryAdapter(config = {}) {
  let dbAdapter = new _eventemitter2.default();
  let _config = _extends({}, defaultConfig, config);
  let state = parseConfig(_config);

  let events = state.events;


  function getStreamsVersionNumbers(streams) {
    let streamsVersionNumbers = events.reduce((streamsVersionNumbers, event) => _extends({}, streamsVersionNumbers, {
      [event.get('stream')]: event.get('versionNumber')
    }), {});
    streams.forEach(stream => {
      streamsVersionNumbers[stream] = streamsVersionNumbers[stream] || 0;
    });
    return streamsVersionNumbers;
  }

  function processAppendRequest({
    appendRequest: { stream, events, expectedVersionNumber },
    streamVersionNumber
  }) {
    if (expectedVersionNumber !== _AppendEventsToStream.ANY_VERSION_NUMBER) {
      let err = new Error();
      err.stream = stream;
      if (streamVersionNumber === 0 && expectedVersionNumber === _AppendEventsToStream.ANY_POSITIVE_VERSION_NUMBER) {
        err.reason = 'STREAM_DOES_NOT_EXIST';
        return err;
      }
      if (streamVersionNumber !== expectedVersionNumber) {
        err.reason = 'STREAM_VERSION_MISMATCH';
        return err;
      }
    }

    return events.map(({ type, data }, idx) => ({
      stream,
      type,
      data,
      versionNumber: streamVersionNumber + idx + 1
    }));
  }

  return Object.defineProperties(dbAdapter, {
    internalEvents: { get: () => events.toJS() },
    appendEvents: {
      value: ({ appendRequests, transactionId }) => {
        let dbResults = new _eventemitter2.default();
        let streams = appendRequests.map(({ stream }) => stream);
        let streamsVersionNumbers = getStreamsVersionNumbers(streams);

        let processedAppendRequests = appendRequests.map(appendRequest => processAppendRequest({
          appendRequest,
          streamVersionNumber: streamsVersionNumbers[appendRequest.stream]
        }));
        let errors = processedAppendRequests.filter(result => result instanceof Error);
        if (errors.length) {
          process.nextTick(() => {
            dbResults.emit('error', new Error(`CONSISTENCY|${JSON.stringify(errors.map(({ stream, reason }) => ({ stream, reason })))}`));
          });
        } else {
          let now = new Date();
          let eventsToAppend = (0, _lodash.flatten)(processedAppendRequests).map((event, idx) => _extends({}, event, {
            id: `${events.length + 1 + idx}`,
            storedOn: now.toISOString(),
            transactionId
          }));

          events = events.concat((0, _immutable.fromJS)(eventsToAppend));

          dbAdapter.emit('update');

          process.nextTick(() => dbResults.emit('storedEvents', eventsToAppend));
        }

        return dbResults;
      },
      enumerable: true
    },
    getEvents: {
      value: ({ fromEventId, limit }) => {
        let dbResults = new _eventemitter2.default();

        let _events = events.filter(event => parseInt(event.get('id'), 10) > fromEventId);
        _events = limit ? _events.slice(0, limit) : _events;

        setTimeout(() => {
          _events.forEach(event => dbResults.emit('event', event.toJS()));
          dbResults.emit('end');
        }, 1);

        return dbResults;
      },
      enumerable: true
    },
    getEventsByStream: {
      value: ({ stream, fromVersionNumber, limit }) => {
        let dbResults = new _eventemitter2.default();

        let _events = events.filter(event => event.get('stream') === stream && event.get('versionNumber') > fromVersionNumber);
        _events = limit ? _events.slice(0, limit) : _events;

        setTimeout(() => {
          _events.forEach(event => dbResults.emit('event', event.toJS()));
          dbResults.emit('end');
        }, 1);

        return dbResults;
      },
      enumerable: true
    },
    getEventsByStreamsCategory: {
      value: ({ streamsCategory, fromEventId, limit }) => {
        let dbResults = new _eventemitter2.default();

        let _events = events.filter(event => {
          let eventId = parseInt(event.get('id'), 10);
          let eventStream = event.get('stream');

          return eventId > fromEventId && (eventStream === streamsCategory || eventStream.split('::')[0] === streamsCategory);
        });
        _events = limit ? _events.slice(0, limit) : _events;

        setTimeout(() => {
          _events.forEach(event => dbResults.emit('event', event.toJS()));
          dbResults.emit('end');
        }, 1);

        return dbResults;
      },
      enumerable: true
    }
  });
}

const defaultConfig = {
  JSONFile: null
};

const prefix = (0, _utils.prefixedString)('[grpc Event Store InMemoryAdapter] ');
const parseConfig = ({
  JSONFile
}) => {
  let state = { events: (0, _immutable.List)() };

  if (JSONFile) {
    let file;
    try {
      file = _fs2.default.statSync(JSONFile);

      if (!file.isFile()) throw new Error();
      try {
        let fileEvents = JSON.parse(_fs2.default.readFileSync(JSONFile, 'utf8'));

        if (!(0, _lodash.isArray)(fileEvents)) throw new Error();
        state.events = (0, _immutable.fromJS)(fileEvents);
      } catch (e) {}
    } catch (e) {
      throw new TypeError(prefix('config.JSONFile MUST be either falsy or a path of a json file containing a list of events'));
    }
  }

  return state;
};

exports.default = InMemoryAdapter;