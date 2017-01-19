'use strict';

var _asFunction = require('should/as-function');

var _asFunction2 = _interopRequireDefault(_asFunction);

var _eventemitter = require('eventemitter3');

var _eventemitter2 = _interopRequireDefault(_eventemitter);

var _grpc = require('grpc');

var _grpc2 = _interopRequireDefault(_grpc);

var _GRPCInterface = require('./GRPCInterface');

var _GRPCInterface2 = _interopRequireDefault(_GRPCInterface);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

describe('GRPCInterface(settings)', function () {
  it('is a function', function () {
    (0, _asFunction2.default)(_GRPCInterface2.default).be.a.Function();
  });
  it('throws if `settings.port` is not a positive integer', function () {
    function notThrowing() {
      (0, _GRPCInterface2.default)({ port: 1 });
    }
    function throwing() {
      (0, _GRPCInterface2.default)({ port: 0 });
    }
    function throwing1() {
      (0, _GRPCInterface2.default)({ port: '' });
    }
    (0, _asFunction2.default)(notThrowing).not.throw();
    (0, _asFunction2.default)(throwing).throw();
    (0, _asFunction2.default)(throwing1).throw();
  });
  it('throws if `settings.credentials is not an instance of grpc.ServerCredentials`', function () {
    function notThrowing() {
      (0, _GRPCInterface2.default)({ credentials: _grpc2.default.ServerCredentials.createInsecure() });
    }
    function throwing() {
      (0, _GRPCInterface2.default)({ credentials: {} });
    }
    (0, _asFunction2.default)(notThrowing).not.throw();
    (0, _asFunction2.default)(throwing).throw();
  });
  it('throws if `settings.writableStreamsPatterns is thruty and is not an array of 0 or more valid strings`', function () {
    function notThrowing() {
      (0, _GRPCInterface2.default)({ writableStreamsPatterns: false });
      (0, _GRPCInterface2.default)({ writableStreamsPatterns: [] });
      (0, _GRPCInterface2.default)({ writableStreamsPatterns: ['a', 'b'] });
    }
    function throwing() {
      (0, _GRPCInterface2.default)({ writableStreamsPatterns: true });
      (0, _GRPCInterface2.default)({ writableStreamsPatterns: {} });
      (0, _GRPCInterface2.default)({ writableStreamsPatterns: ['a', null, 'b'] });
    }
    (0, _asFunction2.default)(notThrowing).not.throw();
    (0, _asFunction2.default)(throwing).throw();
  });
  describe('grpcIface', function () {
    it('is an instance of EventEmitter', function () {
      var grpcIface = (0, _GRPCInterface2.default)();
      (0, _asFunction2.default)(grpcIface).be.an.instanceof(_eventemitter2.default);
    });
    it('grpcIface.connect and grpcIface.disconnect are functions', function () {
      var iface = (0, _GRPCInterface2.default)();
      (0, _asFunction2.default)(iface.connect).be.a.Function();
      (0, _asFunction2.default)(iface.disconnect).be.a.Function();
    });
  });
});