'use strict';

var _asFunction = require('should/as-function');

var _asFunction2 = _interopRequireDefault(_asFunction);

var _ = require('..');

var _2 = _interopRequireDefault(_);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

describe('.subscribeToStream(call)', function () {
  it('emits `error` on call if call.request.stream is not a valid string', function (done) {
    var simulation = InMemorySimulation(data);
    var implementation = (0, _2.default)(simulation);

    // No stream
    var request = { stream: '' };
    implementation.subscribeToStream(simulation.call);
    simulation.call.emit('data', request);

    process.nextTick(function () {
      var emitArgs = simulation.call.emit.secondCall.args;

      (0, _asFunction2.default)(simulation.call.emit.calledTwice).be.True();
      (0, _asFunction2.default)(emitArgs[0]).equal('error');
      (0, _asFunction2.default)(emitArgs[1]).be.an.instanceof(Error);
      done();
    });
  });
  it('invokes call.write() with every live event about stream', function (done) {
    var simulation = InMemorySimulation(data);
    var implementation = (0, _2.default)(simulation);

    var request = { stream: 'StreamX' };
    implementation.subscribeToStream(simulation.call);
    simulation.call.emit('data', request);
    simulation.store.publishEvents([{ id: 100010, stream: 'StreamX' }, { id: 100011, stream: 'Other' }, { id: 100012, stream: 'StreamX' }]);
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
    var simulation = InMemorySimulation(data);
    var implementation = (0, _2.default)(simulation);

    var request = { stream: 'StreamX' };
    implementation.subscribeToStream(simulation.call);
    simulation.call.emit('data', request);
    simulation.store.publishEvents([{ id: 100010, stream: 'StreamX' }, { id: 100011, stream: 'StreamX' }]);

    setTimeout(function () {
      simulation.store.publishEvents([{ id: 100012, stream: 'StreamX' }, { id: 100013, stream: 'StreamX' }]);
    }, 150);

    setTimeout(function () {
      simulation.call.emit('end');
    }, 200);

    setTimeout(function () {
      var calls = simulation.call.write.getCalls();
      (0, _asFunction2.default)(calls.length).equal(2);
      (0, _asFunction2.default)(calls.map(function (_ref2) {
        var args = _ref2.args;
        return args[0] && args[0].id;
      })).containDeepOrdered([100010, 100011]);
      done();
    }, 300);
  });
});