'use strict';

var _asFunction = require('should/as-function');

var _asFunction2 = _interopRequireDefault(_asFunction);

var _lodash = require('lodash');

var _ = require('..');

var _2 = _interopRequireDefault(_);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

describe('.readStoreStreamForward(call)', function () {
  it('invokes backend.getEvents() with right parameters', function () {
    var simulation = InMemorySimulation(data);
    var implementation = (0, _2.default)(simulation);

    simulation.call.request = {
      fromEventId: (0, _lodash.random)(-10, 10),
      limit: (0, _lodash.random)(-10, 10)
    };

    implementation.readStoreStreamForward(simulation.call);

    var calls = simulation.backend.getEvents.getCalls();
    (0, _asFunction2.default)(calls.length === 1).be.True();
    (0, _asFunction2.default)(calls[0].args[0].fromEventId).equal((0, _lodash.max)([0, simulation.call.request.fromEventId]));
    (0, _asFunction2.default)(calls[0].args[0].limit).equal(simulation.call.request.limit < 1 ? undefined : simulation.call.request.limit);
  });
  it('invokes call.write() for every fetched event, in the right sequence', function (done) {
    var fromEventId = (0, _lodash.random)(Math.round(data.events.size * 0.8), data.events.size);
    var storedEvents = data.events.filter(function (event) {
      return event.get('id') > fromEventId;
    });

    var limit = (0, _lodash.random)(storedEvents.size);
    if (limit) storedEvents = storedEvents.slice(0, limit);

    var simulation = InMemorySimulation(data);
    var implementation = (0, _2.default)(simulation);

    simulation.call.request = {
      fromEventId: fromEventId,
      limit: limit
    };

    implementation.readStoreStreamForward(simulation.call);

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
    }, 110 + storedEvents.size * 5);
  });
  it('invokes call.end() after all the stored events are written', function (done) {
    var fromEventId = (0, _lodash.random)(Math.round(data.events.size * 0.8), data.events.size);
    var storedEvents = data.events.filter(function (event) {
      return event.get('id') > fromEventId;
    });
    var limit = (0, _lodash.random)(storedEvents.size);
    if (limit) storedEvents = storedEvents.slice(0, limit);

    var simulation = InMemorySimulation(data);
    var implementation = (0, _2.default)(simulation);

    simulation.call.request = {
      fromEventId: fromEventId,
      limit: limit
    };

    implementation.readStoreStreamForward(simulation.call);

    setTimeout(function () {
      (0, _asFunction2.default)(simulation.call.end.calledOnce).be.True();
      done();
    }, 110 + storedEvents.size * 5);
  });
});