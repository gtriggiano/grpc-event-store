'use strict';

var _asFunction = require('should/as-function');

var _asFunction2 = _interopRequireDefault(_asFunction);

var _lodash = require('lodash');

var _ = require('..');

var _2 = _interopRequireDefault(_);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

describe('.subscribeToCategoryOfStreams(call)', function () {
  it('emits `error` on call if call.request.streamsCategory is not a valid string', function (done) {
    var simulation = InMemorySimulation(data);
    var implementation = (0, _2.default)(simulation);

    // No streamsCategory
    var request = {
      streamsCategory: ''
    };
    implementation.subscribeToCategoryOfStreams(simulation.call);
    simulation.call.emit('data', request);

    process.nextTick(function () {
      var emitArgs = simulation.call.emit.secondCall.args;

      (0, _asFunction2.default)(simulation.call.emit.calledTwice).be.True();
      (0, _asFunction2.default)(emitArgs[0]).equal('error');
      (0, _asFunction2.default)(emitArgs[1]).be.an.instanceof(Error);
      done();
    });
  });
  it('invokes call.write() for every live event about streams of given category', function (done) {
    var testCategory = (0, _lodash.sample)(STREAMS_CATEGORIES.toJS());

    var simulation = InMemorySimulation(data);
    var implementation = (0, _2.default)(simulation);

    var request = {
      streamsCategory: testCategory
    };
    implementation.subscribeToCategoryOfStreams(simulation.call);
    simulation.call.emit('data', request);
    simulation.store.publishEvents([{ id: 100010, stream: testCategory + '-100' }, { id: 100011, stream: 'other' }, { id: 100012, stream: '' + testCategory }]);

    setTimeout(function () {
      var writeCalls = simulation.call.write.getCalls();
      (0, _asFunction2.default)(writeCalls.length).equal(2);
      (0, _asFunction2.default)(writeCalls.map(function (_ref) {
        var args = _ref.args;
        return args[0] && args[0].id;
      })).containDeepOrdered([100010, 100012]);
      simulation.call.emit('end');
      done();
    }, 150);
  });
  it('stops invoking call.write() if client ends subscription', function (done) {
    var testCategory = (0, _lodash.sample)(STREAMS_CATEGORIES.toJS());

    var simulation = InMemorySimulation(data);
    var implementation = (0, _2.default)(simulation);

    var request = {
      streamsCategory: testCategory
    };
    implementation.subscribeToCategoryOfStreams(simulation.call);
    simulation.call.emit('data', request);
    simulation.store.publishEvents([{ id: 100010, stream: testCategory + '-100' }, { id: 100011, stream: 'other' }, { id: 100012, stream: '' + testCategory }]);

    setTimeout(function () {
      simulation.store.publishEvents([{ id: 100013, stream: testCategory + '-100' }, { id: 100014, stream: '' + testCategory }]);
    }, 150);

    setTimeout(function () {
      simulation.call.emit('end');
    }, 200);

    setTimeout(function () {
      var calls = simulation.call.write.getCalls();
      var eventIds = calls.map(function (_ref2) {
        var args = _ref2.args;
        return args[0] && args[0].id;
      });
      (0, _asFunction2.default)(eventIds.length).equal(2);
      (0, _asFunction2.default)(eventIds).containDeepOrdered([100010, 100012]);
      (0, _asFunction2.default)(eventIds).not.containDeepOrdered([100013, 100014]);
      done();
    }, 300);
  });
});