'use strict';

var _asFunction = require('should/as-function');

var _asFunction2 = _interopRequireDefault(_asFunction);

var _ = require('.');

var _2 = _interopRequireDefault(_);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

describe('.ping(_, callback)', function () {
  it('calls callback(null, {})', function () {
    var simulation = InMemorySimulation(data);
    var implementation = (0, _2.default)(simulation);
    implementation.ping(simulation.call, simulation.callback);
    (0, _asFunction2.default)(simulation.callback.callCount).equal(1);
    var callArgs = simulation.callback.firstCall.args;
    (0, _asFunction2.default)(callArgs[0]).be.Null();
    (0, _asFunction2.default)(callArgs[1]).be.an.Object();
    (0, _asFunction2.default)(Object.keys(callArgs[1]).length).equal(0);
  });
});