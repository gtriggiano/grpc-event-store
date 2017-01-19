'use strict';

var _asFunction = require('should/as-function');

var _asFunction2 = _interopRequireDefault(_asFunction);

var _lodash = require('lodash');

var _ = require('..');

var _2 = _interopRequireDefault(_);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

describe('.catchUpStream(call)', function () {
  it('emits `error` on call if call.request.stream is not a valid string', function (done) {
    var simulation = InMemorySimulation(data);
    var implementation = (0, _2.default)(simulation);

    // No stream
    implementation.catchUpStream(simulation.call);
    simulation.call.emit('data', { stream: '' });

    process.nextTick(function () {
      var emitArgs = simulation.call.emit.secondCall.args;

      (0, _asFunction2.default)(simulation.call.emit.calledTwice).be.True();
      (0, _asFunction2.default)(emitArgs[0]).equal('error');
      (0, _asFunction2.default)(emitArgs[1]).be.an.instanceof(Error);
      done();
    });
  });
  it('invokes backend.getEventsByStream() with right parameters', function (done) {
    var simulation = InMemorySimulation(data);
    var implementation = (0, _2.default)(simulation);

    var request = {
      stream: 'StreamX',
      fromVersionNumber: (0, _lodash.random)(-10, 10)
    };
    implementation.catchUpStream(simulation.call);
    simulation.call.emit('data', request);

    process.nextTick(function () {
      var calls = simulation.backend.getEventsByStream.getCalls();
      (0, _asFunction2.default)(calls.length === 1).be.True();
      (0, _asFunction2.default)(calls[0].args[0].stream).containEql(request.stream);
      (0, _asFunction2.default)(calls[0].args[0].fromVersionNumber).equal((0, _lodash.max)([0, request.fromVersionNumber]));
      (0, _asFunction2.default)(calls[0].args[0].limit).equal(undefined);
      done();
    });
  });
  it('invokes call.write() for every fetched and live event of stream, in the right sequence', function (done) {
    var testStream = data.streams.get((0, _lodash.random)(data.streams.size - 1));
    var testStreamVersion = testStream.get('version');
    var storedEvents = data.events.filter(function (event) {
      return event.get('stream') === testStream.get('id');
    });
    var fromVersionNumber = storedEvents.get((0, _lodash.random)(0, storedEvents.size - 1)).get('versionNumber');
    storedEvents = storedEvents.filter(function (event) {
      return event.get('versionNumber') > fromVersionNumber;
    });

    var simulation = InMemorySimulation(data);
    var implementation = (0, _2.default)(simulation);

    var request = {
      stream: testStream.get('id'),
      fromVersionNumber: fromVersionNumber
    };
    implementation.catchUpStream(simulation.call);
    simulation.call.emit('data', request);

    simulation.store.publishEvents([{ id: 100010, stream: testStream.get('id'), versionNumber: ++testStreamVersion }, { id: 100011, stream: 'other' }, { id: 100012, stream: testStream.get('id'), versionNumber: ++testStreamVersion }, { id: 100013, stream: testStream.get('id'), versionNumber: ++testStreamVersion }, { id: 100014, stream: 'other' }, { id: 100015, stream: testStream.get('id'), versionNumber: ++testStreamVersion }]);

    setTimeout(function () {
      var writeCalls = simulation.call.write.getCalls();
      (0, _asFunction2.default)(writeCalls.length).equal(storedEvents.size + 4);
      (0, _asFunction2.default)(writeCalls.map(function (_ref) {
        var args = _ref.args;
        return args[0] && args[0].id;
      })).containDeepOrdered(storedEvents.toJS().map(function (_ref2) {
        var id = _ref2.id;
        return id;
      }).concat([100010, 100012, 100013, 100015]));
      simulation.call.emit('end');
      done();
    }, 150 + storedEvents.size * 3);
  });
  it('stops invoking call.write() if client ends subscription', function (done) {
    var testStream = data.streams.get((0, _lodash.random)(data.streams.size - 1));
    var testStreamVersion = testStream.get('version');

    var simulation = InMemorySimulation(data);
    var implementation = (0, _2.default)(simulation);

    var request = {
      stream: testStream.get('id'),
      fromVersion: 1
    };
    implementation.catchUpStream(simulation.call);
    simulation.call.emit('data', request);
    simulation.store.publishEvents([{ id: 100010, stream: testStream.get('id'), versionNumber: ++testStreamVersion }, { id: 100011, stream: testStream.get('id'), versionNumber: ++testStreamVersion }]);

    setTimeout(function () {
      simulation.store.publishEvents([{ id: 100012, stream: testStream.get('id'), versionNumber: ++testStreamVersion }, { id: 100013, stream: testStream.get('id'), versionNumber: ++testStreamVersion }]);
    }, 150);

    setTimeout(function () {
      simulation.call.emit('end');
    }, 200);

    setTimeout(function () {
      var calls = simulation.call.write.getCalls();
      var eventIds = calls.map(function (_ref3) {
        var args = _ref3.args;
        return args[0] && args[0].id;
      });
      (0, _asFunction2.default)(eventIds).containDeepOrdered([100010, 100011]);
      (0, _asFunction2.default)(eventIds).not.containDeepOrdered([100012, 100013]);
      done();
    }, 400);
  });
});