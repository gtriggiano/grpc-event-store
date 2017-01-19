'use strict';

var _asFunction = require('should/as-function');

var _asFunction2 = _interopRequireDefault(_asFunction);

var _eventemitter = require('eventemitter3');

var _eventemitter2 = _interopRequireDefault(_eventemitter);

var _rxjs = require('rxjs');

var _rxjs2 = _interopRequireDefault(_rxjs);

var _StoreInterface = require('./StoreInterface');

var _StoreInterface2 = _interopRequireDefault(_StoreInterface);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

describe('StoreInterface([settings])', function () {
  it('is a function', function () {
    (0, _asFunction2.default)(_StoreInterface2.default).be.a.Function();
  });
  it('throws if `settings.host` is not a string with length > 0', function () {
    function throwing() {
      (0, _StoreInterface2.default)({ host: '' });
    }
    function throwing1() {
      (0, _StoreInterface2.default)({ host: 1 });
    }
    (0, _asFunction2.default)(throwing).throw();
    (0, _asFunction2.default)(throwing1).throw();
  });
  it('throws if `settings.coordinationPort` is not a positive integer', function () {
    function throwing() {
      (0, _StoreInterface2.default)({ coordinationPort: 0 });
    }
    function throwing1() {
      (0, _StoreInterface2.default)({ coordinationPort: '' });
    }
    (0, _asFunction2.default)(throwing).throw();
    (0, _asFunction2.default)(throwing1).throw();
  });
  describe('storeIface', function () {
    it('is an instanceof EventEmitter', function () {
      var iface = (0, _StoreInterface2.default)();
      (0, _asFunction2.default)(iface instanceof _eventemitter2.default).be.True();
    });
    it('storeIface.eventStream is an instance of Rx.ConnectableObservable', function () {
      var iface = (0, _StoreInterface2.default)();
      (0, _asFunction2.default)(iface.eventsStream).be.an.instanceof(_rxjs2.default.ConnectableObservable);
    });
    it('storeIface.connect, storeIface.disconnect and storeIface.publishEvents are functions', function () {
      var iface = (0, _StoreInterface2.default)();
      (0, _asFunction2.default)(iface.connect).be.a.Function();
      (0, _asFunction2.default)(iface.disconnect).be.a.Function();
      (0, _asFunction2.default)(iface.publishEvents).be.a.Function();
    });
  });
});