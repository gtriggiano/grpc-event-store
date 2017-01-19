'use strict';

var _lodash = require('lodash');

var _asFunction = require('should/as-function');

var _asFunction2 = _interopRequireDefault(_asFunction);

var _sinon = require('sinon');

var _sinon2 = _interopRequireDefault(_sinon);

var _BackendInterface = require('./BackendInterface');

var _BackendInterface2 = _interopRequireDefault(_BackendInterface);

var _backends = require('./BackendInterface/backends');

var _backends2 = _interopRequireDefault(_backends);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var availableBackends = Object.keys(_backends2.default);

describe('BackendInterface(settings)', function () {
  it('is a function', function () {
    (0, _asFunction2.default)(_BackendInterface2.default).be.a.Function();
  });
  it('returns `settings.backend` if `settings` is an instance of CustomBackendWrapper', function () {
    var s = {};
    var settings = new _BackendInterface.CustomBackendWrapper(s);
    var out = (0, _BackendInterface2.default)(settings);
    (0, _asFunction2.default)(out === settings.backend).be.True();
  });
  it('throws if `settings.type` is not a string with length > 0', function () {
    function throwing() {
      (0, _BackendInterface2.default)({ type: '' });
    }
    function throwing1() {
      (0, _BackendInterface2.default)({ type: 1 });
    }
    (0, _asFunction2.default)(throwing).throw();
    (0, _asFunction2.default)(throwing1).throw();
  });
  it('throws if `settings.type` is not one of [' + availableBackends.join(', ') + ']', function () {
    function throwing() {
      (0, _BackendInterface2.default)({ type: 'xxxxxxxx' });
    }
    (0, _asFunction2.default)(throwing).throw();
  });
  it('calls the appropriate backend factory and return its output', function () {
    var spies = availableBackends.reduce(function (spies, type) {
      var spy = _sinon2.default.spy(_backends2.default, type);
      spies[type] = spy;
      return spies;
    }, {});
    var backendType = (0, _lodash.sample)(availableBackends);
    var backend = (0, _BackendInterface2.default)({ type: backendType });
    (0, _asFunction2.default)(spies[backendType].calledOnce).be.True();
    (0, _asFunction2.default)(spies[backendType].returned(backend)).be.True();
    (0, _lodash.each)(spies, function (spy) {
      return spy.restore();
    });
  });
  describe('.customBackend(backendInstance)', function () {
    it('returns an instance of CustomBackendWrapper with `backendInstance` as .backend property', function () {
      var backendInstance = {};
      var out = _BackendInterface2.default.customBackend(backendInstance);
      (0, _asFunction2.default)(out instanceof _BackendInterface.CustomBackendWrapper).be.True();
      (0, _asFunction2.default)(out.backend === backendInstance).be.True();
    });
  });
});