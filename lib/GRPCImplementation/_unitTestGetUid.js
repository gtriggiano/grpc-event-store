'use strict';

var _asFunction = require('should/as-function');

var _asFunction2 = _interopRequireDefault(_asFunction);

var _shortid = require('shortid');

var _shortid2 = _interopRequireDefault(_shortid);

var _ = require('.');

var _2 = _interopRequireDefault(_);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

describe('.getUid(_, callback)', function () {
  it('calls callback(null, {uid})', function () {
    var simulation = InMemorySimulation(data);
    var implementation = (0, _2.default)(simulation);
    implementation.getUid(simulation.call, simulation.callback);
    (0, _asFunction2.default)(simulation.callback.callCount).equal(1);
    var callArgs = simulation.callback.firstCall.args;
    (0, _asFunction2.default)(callArgs[0]).be.Null();
    (0, _asFunction2.default)(callArgs[1]).be.an.Object();
    (0, _asFunction2.default)(_shortid2.default.isValid(callArgs[1].uid)).be.True();
  });
});