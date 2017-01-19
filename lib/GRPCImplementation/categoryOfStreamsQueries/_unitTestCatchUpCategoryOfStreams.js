'use strict';

var _asFunction = require('should/as-function');

var _asFunction2 = _interopRequireDefault(_asFunction);

var _lodash = require('lodash');

var _ = require('..');

var _2 = _interopRequireDefault(_);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

describe('.catchUpCategoryOfStreams(call)', function () {
  it('emits `error` on call if call.request.streamsCategory is not a valid string', function (done) {
    var simulation = InMemorySimulation(data);
    var implementation = (0, _2.default)(simulation);

    // No streamsCategory
    var request = {
      streamsCategory: '',
      fromEventId: 0
    };
    implementation.catchUpCategoryOfStreams(simulation.call);
    simulation.call.emit('data', request);

    process.nextTick(function () {
      var emitArgs = simulation.call.emit.secondCall.args;

      (0, _asFunction2.default)(simulation.call.emit.calledTwice).be.True();
      (0, _asFunction2.default)(emitArgs[0]).equal('error');
      (0, _asFunction2.default)(emitArgs[1]).be.an.instanceof(Error);

      done();
    });
  });
  it('invokes backend.getEventsByStreamCategory() with right parameters', function (done) {
    var simulation = InMemorySimulation(data);
    var implementation = (0, _2.default)(simulation);

    var request = {
      streamsCategory: 'Streams0',
      fromEventId: (0, _lodash.random)(-10, 10)
    };
    implementation.catchUpCategoryOfStreams(simulation.call);
    simulation.call.emit('data', request);

    process.nextTick(function () {
      var calls = simulation.backend.getEventsByStreamCategory.getCalls();
      (0, _asFunction2.default)(calls.length === 1).be.True();
      (0, _asFunction2.default)(calls[0].args[0].streamsCategory).equal(request.streamsCategory);
      (0, _asFunction2.default)(calls[0].args[0].fromEventId).equal((0, _lodash.max)([0, request.fromEventId]));
      (0, _asFunction2.default)(calls[0].args[0].limit).equal(undefined);
      done();
    });
  });
  it('invokes call.write() for every fetched and live event about streams of given category, in the right sequence', function (done) {
    var testCategory = (0, _lodash.sample)(STREAMS_CATEGORIES.toJS());
    var storedEvents = data.events.filter(function (event) {
      return event.get('stream').split('-')[0] === testCategory;
    });
    var fromEventId = storedEvents.get((0, _lodash.random)(0, storedEvents.size - 1)).get('id');
    storedEvents = storedEvents.filter(function (event) {
      return event.get('id') > fromEventId;
    });

    var simulation = InMemorySimulation(data);
    var implementation = (0, _2.default)(simulation);

    var request = {
      streamsCategory: testCategory,
      fromEventId: fromEventId
    };
    implementation.catchUpCategoryOfStreams(simulation.call);
    simulation.call.emit('data', request);
    simulation.store.publishEvents([{ id: 100010, stream: testCategory + '-100' }, { id: 100011, stream: 'other' }, { id: 100012, stream: '' + testCategory }]);

    setTimeout(function () {
      var writeCalls = simulation.call.write.getCalls();
      (0, _asFunction2.default)(writeCalls.length).equal(storedEvents.size + 2);
      (0, _asFunction2.default)(writeCalls.map(function (_ref) {
        var args = _ref.args;
        return args[0] && args[0].id;
      })).containDeepOrdered([100010, 100012]);
      simulation.call.emit('end');
      done();
    }, 100 + storedEvents.size * 5);
  });
  it('stops invoking call.write() if client ends subscription', function (done) {
    var testCategory = (0, _lodash.sample)(STREAMS_CATEGORIES.toJS());
    var storedEvents = data.events.filter(function (event) {
      return event.get('stream').split('-')[0] === testCategory;
    });
    var fromEventId = storedEvents.get((0, _lodash.random)(0, storedEvents.size - 1)).get('id');
    storedEvents = storedEvents.filter(function (event) {
      return event.get('id') > fromEventId;
    });

    var simulation = InMemorySimulation(data);
    var implementation = (0, _2.default)(simulation);

    var request = {
      streamsCategory: testCategory,
      fromEventId: fromEventId
    };
    implementation.catchUpCategoryOfStreams(simulation.call);
    simulation.call.emit('data', request);

    setTimeout(function () {
      simulation.call.emit('end');
    }, 120);

    setTimeout(function () {
      var calls = simulation.call.write.getCalls();
      (0, _asFunction2.default)(calls.length).be.below(storedEvents.size);
      done();
    }, 100 + storedEvents.size * 5);
  });
});