'use strict';

var _lodash = require('lodash');

var _asFunction = require('should/as-function');

var _asFunction2 = _interopRequireDefault(_asFunction);

var _sinon = require('sinon');

var _sinon2 = _interopRequireDefault(_sinon);

var _rxjs = require('rxjs');

var _rxjs2 = _interopRequireDefault(_rxjs);

var _eventemitter = require('eventemitter3');

var _eventemitter2 = _interopRequireDefault(_eventemitter);

var _shortid = require('shortid');

var _shortid2 = _interopRequireDefault(_shortid);

var _utils = require('./utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

describe('Utilities', function () {
  describe('prefixString(prefix, str)', function () {
    it('is a function', function () {
      return (0, _asFunction2.default)(_utils.prefixString).be.a.Function();
    });
    it('is curried', function () {
      (0, _asFunction2.default)((0, _utils.prefixString)('prefix')).be.a.Function();
    });
    it('returns `{prefix}{str}`', function () {
      (0, _asFunction2.default)((0, _utils.prefixString)('Hello', ' world!')).equal('Hello world!');
    });
  });
  describe('timeoutCallback(timeout, msg, cb)', function () {
    it('is a function', function () {
      return (0, _asFunction2.default)(_utils.timeoutCallback).be.a.Function();
    });
    it('is curried', function () {
      (0, _asFunction2.default)((0, _utils.timeoutCallback)(1000)).be.a.Function();
      (0, _asFunction2.default)((0, _utils.timeoutCallback)(1000, 'message')).be.a.Function();
    });
    it('returns a function', function () {
      var timingoutCallback = (0, _utils.timeoutCallback)(1000, 'timeout!', function () {});
      (0, _asFunction2.default)(timingoutCallback).be.a.Function();
    });
    it('the returned function, if called within `timeout`, invokes `cb` with the same arguments', function () {
      var cb = function cb(one, two, three) {
        (0, _asFunction2.default)(one).equal(1);
        (0, _asFunction2.default)(two).equal(2);
        (0, _asFunction2.default)(three).equal(3);
      };

      var tcb = (0, _utils.timeoutCallback)(1000, 'Timeout!', cb);
      tcb(1, 2, 3);
    });
    it('if the returned function is not called within `timeout`, `cb` is called with `new Error(msg)` as first argument', function (done) {
      var cb = function cb(err) {
        (0, _asFunction2.default)(err).be.an.Error();
        (0, _asFunction2.default)(err.message).equal('Timeout error...');
        done();
      };
      (0, _utils.timeoutCallback)(300, 'Timeout error...', cb);
    });
    it('`cb` is called only once in any case', function (done) {
      var cb = _sinon2.default.spy();
      var cb1 = _sinon2.default.spy();

      var tcb = (0, _utils.timeoutCallback)(50, 'timeout', cb);
      tcb();
      (0, _utils.timeoutCallback)(50, 'timeout', cb1);

      setTimeout(function () {
        (0, _asFunction2.default)(cb.callCount).equal(1);
        (0, _asFunction2.default)(cb1.callCount).equal(1);
        done();
      }, 100);
    });
  });
  describe('isValidString(str)', function () {
    it('is a function', function () {
      return (0, _asFunction2.default)(_utils.isValidString).be.a.Function();
    });
    it('returns true if `str` is a string of length > 0, false otherwise', function () {
      (0, _asFunction2.default)((0, _utils.isValidString)('t')).be.True();
      (0, _asFunction2.default)((0, _utils.isValidString)('')).be.False();
      (0, _asFunction2.default)((0, _utils.isValidString)({})).be.False();
      (0, _asFunction2.default)((0, _utils.isValidString)([])).be.False();
      (0, _asFunction2.default)((0, _utils.isValidString)(1)).be.False();
      (0, _asFunction2.default)((0, _utils.isValidString)(function () {})).be.False();
    });
  });
  describe('isValidHostname(str)', function () {
    it('is a function', function () {
      return (0, _asFunction2.default)(_utils.isValidHostname).be.a.Function();
    });
    it('returns true if `str` is a valid hostname, false otherwise', function () {
      (0, _asFunction2.default)((0, _utils.isValidHostname)('github')).be.True();
      (0, _asFunction2.default)((0, _utils.isValidHostname)('github.com')).be.True();
      (0, _asFunction2.default)((0, _utils.isValidHostname)('')).be.False();
      (0, _asFunction2.default)((0, _utils.isValidHostname)(2)).be.False();
      (0, _asFunction2.default)((0, _utils.isValidHostname)({})).be.False();
      (0, _asFunction2.default)((0, _utils.isValidHostname)(false)).be.False();
      (0, _asFunction2.default)((0, _utils.isValidHostname)('@github')).be.False();
      (0, _asFunction2.default)((0, _utils.isValidHostname)('@github..com')).be.False();
    });
  });
  describe('isPositiveInteger(n)', function () {
    it('is a function', function () {
      return (0, _asFunction2.default)(_utils.isPositiveInteger).be.a.Function();
    });
    it('returns true if `n` is a positive integer, false otherwise', function () {
      (0, _asFunction2.default)((0, _utils.isPositiveInteger)(1)).be.True();
      (0, _asFunction2.default)((0, _utils.isPositiveInteger)(-1)).be.False();
      (0, _asFunction2.default)((0, _utils.isPositiveInteger)(1.3)).be.False();
      (0, _asFunction2.default)((0, _utils.isPositiveInteger)('')).be.False();
      (0, _asFunction2.default)((0, _utils.isPositiveInteger)({})).be.False();
      (0, _asFunction2.default)((0, _utils.isPositiveInteger)([])).be.False();
      (0, _asFunction2.default)((0, _utils.isPositiveInteger)(function () {})).be.False();
    });
  });
  describe('isListOfValidStrings(list)', function () {
    it('is a function', function () {
      return (0, _asFunction2.default)(_utils.isListOfValidStrings).be.a.Function();
    });
    it('returns true if `list` is an array of 0 or more strings having length > 0, false otherwise', function () {
      (0, _asFunction2.default)((0, _utils.isListOfValidStrings)([])).be.True();
      (0, _asFunction2.default)((0, _utils.isListOfValidStrings)(['string'])).be.True();
      (0, _asFunction2.default)((0, _utils.isListOfValidStrings)('')).be.False();
      (0, _asFunction2.default)((0, _utils.isListOfValidStrings)({})).be.False();
      (0, _asFunction2.default)((0, _utils.isListOfValidStrings)([1])).be.False();
      (0, _asFunction2.default)((0, _utils.isListOfValidStrings)(1)).be.False();
      (0, _asFunction2.default)((0, _utils.isListOfValidStrings)(function () {})).be.False();
    });
  });
  describe('.isWritableStream(stream, writableStreamsGlobs)', function () {
    it('is a function', function () {
      return (0, _asFunction2.default)(_utils.isWritableStream).be.a.Function();
    });
    it('returns true if `writableStreamsGlobs` is falsy or an empty array', function () {
      (0, _asFunction2.default)((0, _utils.isWritableStream)('test', false)).be.True();
      (0, _asFunction2.default)((0, _utils.isWritableStream)('test', [])).be.True();
    });
    it('returns true if any of the passed regex matches `stream`', function () {
      (0, _asFunction2.default)((0, _utils.isWritableStream)('test-stream', [new RegExp('nomatches'), new RegExp('^test')])).be.True();
      (0, _asFunction2.default)((0, _utils.isWritableStream)('test-stream', [new RegExp('am$')])).be.True();
    });
    it('returns false if none of the passed regex matches `stream`', function () {
      (0, _asFunction2.default)((0, _utils.isWritableStream)('test-stream', [new RegExp('test$'), new RegExp('^stream')])).be.False();
    });
  });
  describe('zeropad(i, minLength)', function () {
    it('is a function', function () {
      return (0, _asFunction2.default)(_utils.zeropad).be.a.Function();
    });
    it('returns a string', function () {
      return (0, _asFunction2.default)((0, _utils.zeropad)(12, 10)).be.a.String();
    });
    it('the returned string has a length >= minLength', function () {
      var i = (0, _lodash.range)((0, _lodash.random)(8, 15)).join('');
      var minLength = (0, _lodash.random)(5, 20);
      (0, _asFunction2.default)((0, _utils.zeropad)(i, minLength).length >= minLength).be.True();
    });
    it('pads String(i) with zeroes if String(i).length < minLength', function () {
      var str = (0, _utils.zeropad)('abc', 5);
      (0, _asFunction2.default)(str).equal('00abc');
    });
  });
  describe('eventsStreamFromBus(busNode[, delayTime = 100])', function () {
    function _fireEventsListsOnBusNode(busNode, eventsLists) {
      Object.keys(eventsLists).forEach(function (time) {
        setTimeout(function () {
          busNode.emit('StoredEvents', JSON.stringify(eventsLists[time].map(function (id) {
            return { id: id };
          })));
        }, parseInt(time, 10));
      });
    }

    it('is a function', function () {
      return (0, _asFunction2.default)(_utils.eventsStreamFromBus).be.a.Function();
    });
    it('returns an instance of Rx.ConnectableObservable', function () {
      var stream = (0, _utils.eventsStreamFromBus)(FixtureBusNode());
      (0, _asFunction2.default)(stream).be.an.instanceof(_rxjs2.default.ConnectableObservable);
    });
    it('delays the output stream by (more or less) `delayTime` ms in respect to the stream of events emitted by `busNode`', function (done) {
      var delayTime = (0, _lodash.random)(120, 160);
      var testBusNode = FixtureBusNode();
      var testStream = (0, _utils.eventsStreamFromBus)(testBusNode, delayTime);

      var subscription = testStream.subscribe(function () {
        var outputTime = process.hrtime(inputTime);
        var msDiff = outputTime[0] * 1e3 + outputTime[1] / 1e6;
        (0, _asFunction2.default)(msDiff > delayTime).be.True();
        (0, _asFunction2.default)(msDiff < delayTime + 10).be.True();
        subscription.unsubscribe();
        done();
      });
      var evt = { id: 1 };
      var inputTime = process.hrtime();
      testBusNode.emit('StoredEvents', JSON.stringify([evt]));
    });
    it('ensures the right order of events emitted by `bus` within `delayTime`, ordering by event.id', function (done) {
      // timeOfBusEmission: [eventId, ...]
      var sourceEventsLists = {
        0: [1],
        80: [2, 3],
        200: [6, 7],
        210: [4, 5],
        220: [8, 9],
        330: [10]
      };

      var testBusNode = FixtureBusNode();
      var testStream = (0, _utils.eventsStreamFromBus)(testBusNode);

      var received = [];
      var subscription = testStream.map(function (_ref) {
        var id = _ref.id;
        return id;
      }).subscribe(function (n) {
        received.push(n);
        if (received.length === 10) {
          subscription.unsubscribe();
          (0, _asFunction2.default)(received).containDeepOrdered([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
          done();
        }
      });

      _fireEventsListsOnBusNode(testBusNode, sourceEventsLists);
    });
  });
  describe('eventsStreamFromBackendEmitter(backendEmitter)', function () {
    it('is a function', function () {
      return (0, _asFunction2.default)(_utils.eventsStreamFromBackendEmitter).be.a.Function();
    });
    it('returns an instance of Rx.Observable', function () {
      var backendEmitter = new _eventemitter2.default();
      var stream = (0, _utils.eventsStreamFromBackendEmitter)(backendEmitter);
      (0, _asFunction2.default)(stream).be.an.instanceof(_rxjs2.default.Observable);
    });
    it('dispatches `event` events of `backendEmitter`', function (done) {
      var backendEmitter = new _eventemitter2.default();
      var stream = (0, _utils.eventsStreamFromBackendEmitter)(backendEmitter);

      var testEvents = (0, _lodash.range)((0, _lodash.random)(1, 5)).map(function () {
        return (0, _shortid2.default)();
      });
      var eventToEmit = 0;
      var dispatchedEvents = [];

      var subscription = stream.subscribe(function (evt) {
        return dispatchedEvents.push(evt);
      }, function (err) {
        return done(err);
      });

      var intval = setInterval(function () {
        var e = testEvents[eventToEmit];
        if (!e) {
          clearInterval(intval);
          subscription.unsubscribe();
          (0, _asFunction2.default)(dispatchedEvents).containDeepOrdered(testEvents);
          done();
          return;
        }
        backendEmitter.emit('event', e);
        eventToEmit++;
      }, 10);
    });
    it('returned eventsStream ends with an error if `backendEmitter` emits an `error` event', function (done) {
      var backendEmitter = new _eventemitter2.default();
      var stream = (0, _utils.eventsStreamFromBackendEmitter)(backendEmitter);
      var dispatchedError = false;

      var subscription = stream.subscribe(function (evt) {
        return done(new Error('should not dispatch enything'));
      }, function (err) {
        dispatchedError = true;
        (0, _asFunction2.default)(err.message).equal('testMessage');
      }, function () {
        return done(new Error('complete handler should not be executed'));
      });

      setTimeout(function () {
        backendEmitter.emit('error', new Error('testMessage'));
        (0, _asFunction2.default)(subscription.closed).be.True();
        (0, _asFunction2.default)(dispatchedError).be.True();
        done();
      }, 20);
    });
    it('returned eventsStream ends if `backendEmitter` emits an `end` event', function (done) {
      var backendEmitter = new _eventemitter2.default();
      var stream = (0, _utils.eventsStreamFromBackendEmitter)(backendEmitter);

      var subscription = stream.subscribe(function (evt) {
        return done(new Error('should not dispatch enything'));
      }, function () {
        return done(new Error('error handler should not be executed'));
      });

      setTimeout(function () {
        backendEmitter.emit('end');
        (0, _asFunction2.default)(subscription.closed).be.True();
        done();
      }, 20);
    });
  });
});