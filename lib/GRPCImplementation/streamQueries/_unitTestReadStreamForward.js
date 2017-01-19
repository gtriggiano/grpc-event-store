'use strict';

var _asFunction = require('should/as-function');

var _asFunction2 = _interopRequireDefault(_asFunction);

var _lodash = require('lodash');

var _ = require('..');

var _2 = _interopRequireDefault(_);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

describe('.readStreamForward(call)', function () {
  it('emits `error` on call if call.request.stream is not a valid string', function () {
    var simulation = InMemorySimulation(data);
    var implementation = (0, _2.default)(simulation);

    // No stream
    simulation.call.request = {
      stream: '',
      fromVersionNumber: 0
    };
    implementation.readStreamForward(simulation.call);
    var emitArgs = simulation.call.emit.firstCall.args;

    (0, _asFunction2.default)(simulation.call.emit.calledOnce).be.True();
    (0, _asFunction2.default)(emitArgs[0]).equal('error');
    (0, _asFunction2.default)(emitArgs[1]).be.an.instanceof(Error);
  });
  it('invokes backend.getEventsByStream() with right parameters', function () {
    var simulation = InMemorySimulation(data);
    var implementation = (0, _2.default)(simulation);

    simulation.call.request = {
      stream: 'StreamX',
      fromVersionNumber: (0, _lodash.random)(-10, 10),
      limit: (0, _lodash.random)(-10, 10)
    };

    implementation.readStreamForward(simulation.call);

    var calls = simulation.backend.getEventsByStream.getCalls();
    (0, _asFunction2.default)(calls.length === 1).be.True();
    (0, _asFunction2.default)(calls[0].args[0].stream).containEql(simulation.call.request.stream);
    (0, _asFunction2.default)(calls[0].args[0].fromVersionNumber).equal((0, _lodash.max)([0, simulation.call.request.fromVersionNumber]));
    (0, _asFunction2.default)(calls[0].args[0].limit).equal(simulation.call.request.limit < 1 ? undefined : simulation.call.request.limit);
  });
  it('invokes call.write() for every fetched stream event, in the right sequence', function (done) {
    var testStream = data.streams.get((0, _lodash.random)(data.streams.size - 1));
    var storedEvents = data.events.filter(function (event) {
      return event.get('stream') === testStream.get('id');
    });
    var fromVersionNumber = storedEvents.get((0, _lodash.random)(0, storedEvents.size - 1)).get('versionNumber');
    storedEvents = storedEvents.filter(function (event) {
      return event.get('versionNumber') > fromVersionNumber;
    });

    var limit = (0, _lodash.random)(storedEvents.size);
    if (limit) storedEvents = storedEvents.slice(0, limit);

    var simulation = InMemorySimulation(data);
    var implementation = (0, _2.default)(simulation);

    simulation.call.request = {
      stream: testStream.get('id'),
      fromVersionNumber: fromVersionNumber,
      limit: limit
    };
    implementation.readStreamForward(simulation.call);

    setTimeout(function () {
      var writeCalls = simulation.call.write.getCalls();
      (0, _asFunction2.default)(writeCalls.length).equal(storedEvents.size);
      (0, _asFunction2.default)(writeCalls.map(function (_ref) {
        var args = _ref.args;
        return args[0] && args[0].id;
      })).containDeepOrdered(storedEvents.toJS().map(function (_ref2) {
        var id = _ref2.id;
        return id;
      }));
      done();
    }, 100 + storedEvents.size * 5);
  });
  it('invokes call.end() after all the stored events are written', function (done) {
    var testStream = data.streams.get((0, _lodash.random)(data.streams.size - 1));
    var storedEvents = data.events.filter(function (event) {
      return event.get('stream') === testStream.get('id');
    });
    var fromVersionNumber = storedEvents.get((0, _lodash.random)(0, storedEvents.size - 1)).get('versionNumber');
    storedEvents = storedEvents.filter(function (event) {
      return event.get('versionNumber') > fromVersionNumber;
    });

    var simulation = InMemorySimulation(data);
    var implementation = (0, _2.default)(simulation);

    simulation.call.request = {
      stream: testStream.get('id'),
      fromVersionNumber: fromVersionNumber
    };
    implementation.readStreamForward(simulation.call);

    setTimeout(function () {
      var writeCalls = simulation.call.write.getCalls();
      (0, _asFunction2.default)(writeCalls.length).equal(storedEvents.size);
      (0, _asFunction2.default)(simulation.call.end.calledOnce).be.True();
      done();
    }, 140 + storedEvents.size * 5);
  });
});