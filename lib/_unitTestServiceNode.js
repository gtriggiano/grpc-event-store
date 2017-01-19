'use strict';

var _asFunction = require('should/as-function');

var _asFunction2 = _interopRequireDefault(_asFunction);

var _sinon = require('sinon');

var _sinon2 = _interopRequireDefault(_sinon);

var _eventemitter = require('eventemitter3');

var _eventemitter2 = _interopRequireDefault(_eventemitter);

var _ServiceNode = require('./ServiceNode');

var _ServiceNode2 = _interopRequireDefault(_ServiceNode);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

describe('ServiceNode(settings)', function () {
  it('is a function', function () {
    (0, _asFunction2.default)(_ServiceNode2.default).be.a.Function();
  });
  it('throws if settings.backendSetupTimeout is not integer or is < 1', function () {
    function throwing() {
      (0, _ServiceNode2.default)({ backendSetupTimeout: '' });
    }
    function throwing2() {
      (0, _ServiceNode2.default)({ backendSetupTimeout: 0 });
    }
    (0, _asFunction2.default)(throwing).throw();
    (0, _asFunction2.default)(throwing2).throw();
  });
  it('console.warn()s if settings.backendSetupTimeout is lower than 500', function () {
    _sinon2.default.stub(console, 'warn', function () {});
    (0, _ServiceNode2.default)({ backendSetupTimeout: 499 });
    (0, _asFunction2.default)(console.warn.called).equal(true);
    console.warn.restore();
  });
  describe('serviceNode', function () {
    it('is an instance of EventEmitter', function () {
      var node = (0, _ServiceNode2.default)();
      (0, _asFunction2.default)(node).be.an.instanceof(_eventemitter2.default);
    });
    it('serviceNode.connect and serviceNode.disconnect are functions', function () {
      var node = (0, _ServiceNode2.default)();
      (0, _asFunction2.default)(node.connect).be.a.Function();
      (0, _asFunction2.default)(node.disconnect).be.a.Function();
    });
  });
});