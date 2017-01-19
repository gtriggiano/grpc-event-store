'use strict';

var _asFunction = require('should/as-function');

var _asFunction2 = _interopRequireDefault(_asFunction);

var _lodash = require('lodash');

var _ = require('..');

var _2 = _interopRequireDefault(_);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

describe('.catchUpStoreStream(call)', function () {
  it('invokes backend.getEvents() with right parameters', function (done) {
    var simulation = InMemorySimulation(data);
    var implementation = (0, _2.default)(simulation);

    var request = {
      fromEventId: (0, _lodash.random)(-10, 10)
    };
    implementation.catchUpStoreStream(simulation.call);
    simulation.call.emit('data', request);

    process.nextTick(function () {
      var calls = simulation.backend.getEvents.getCalls();
      (0, _asFunction2.default)(calls.length).equal(1);
      (0, _asFunction2.default)(calls[0].args[0].fromEventId).equal((0, _lodash.max)([0, request.fromEventId]));
      (0, _asFunction2.default)(calls[0].args[0].limit).equal(undefined);
      done();
    });
  });
  it('invokes call.write() for every fetched and live event, in the right sequence', function (done) {
    var fromEventId = data.events.size - 3;
    var storedEvents = data.events.filter(function (event) {
      return event.get('id') > fromEventId;
    });

    var simulation = InMemorySimulation(data);
    var implementation = (0, _2.default)(simulation);

    implementation.catchUpStoreStream(simulation.call);
    simulation.call.emit('data', { fromEventId: fromEventId });
    simulation.store.publishEvents([{ id: 100010 }, { id: 100011 }, { id: 100012 }]);

    setTimeout(function () {
      var writeCalls = simulation.call.write.getCalls();
      var eventIds = writeCalls.map(function (_ref) {
        var args = _ref.args;
        return args[0] && args[0].id;
      });
      (0, _asFunction2.default)(eventIds.length).equal(storedEvents.size + 3);
      (0, _asFunction2.default)(eventIds).containDeepOrdered([100010, 100011, 100012]);
      simulation.call.emit('end');
      done();
    }, 300);
  });
  it('stops invoking call.write() if client ends subscription', function (done) {
    var fromEventId = data.events.size - 3;
    var storedEvents = data.events.filter(function (event) {
      return event.get('id') > fromEventId;
    });

    var simulation = InMemorySimulation(data);
    var implementation = (0, _2.default)(simulation);

    implementation.catchUpStoreStream(simulation.call);
    simulation.call.emit('data', { fromEventId: fromEventId });

    simulation.store.publishEvents([{ id: 100010 }, { id: 100011 }, { id: 100012 }]);

    // Published events arrive 100 ms later
    setTimeout(function () {
      simulation.store.publishEvents([{ id: 100013 }, { id: 100014 }]);
    }, 150);

    setTimeout(function () {
      simulation.call.emit('end');
    }, 200);

    setTimeout(function () {
      var writeCalls = simulation.call.write.getCalls();
      var eventIds = writeCalls.map(function (_ref2) {
        var args = _ref2.args;
        return args[0] && args[0].id;
      });

      (0, _asFunction2.default)(eventIds.length).equal(storedEvents.size + 3);
      (0, _asFunction2.default)(eventIds).containDeepOrdered([100010, 100011, 100012]);
      (0, _asFunction2.default)(eventIds).not.containDeepOrdered([100013, 100014]);
      done();
    }, 400);
  });
});