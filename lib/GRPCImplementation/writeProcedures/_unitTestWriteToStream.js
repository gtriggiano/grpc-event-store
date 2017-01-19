'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _asFunction = require('should/as-function');

var _asFunction2 = _interopRequireDefault(_asFunction);

var _shortid = require('shortid');

var _shortid2 = _interopRequireDefault(_shortid);

var _ = require('..');

var _2 = _interopRequireDefault(_);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

describe('.writeToStream(call, callback)', function () {
  it('invokes callback(error) if call.request.stream is not a valid string', function () {
    var simulation = InMemorySimulation(data);
    var implementation = (0, _2.default)(simulation);

    // No stream
    simulation.call.request = {
      stream: '',
      events: [{ type: 'Test' }]
    };
    implementation.writeToStream(simulation.call, simulation.callback);
    var callbackCalls = simulation.callback.getCalls();
    (0, _asFunction2.default)(callbackCalls.length).equal(1);
    (0, _asFunction2.default)(callbackCalls[0].args.length).equal(1);
    (0, _asFunction2.default)(callbackCalls[0].args[0]).be.instanceof(Error);
    (0, _asFunction2.default)(callbackCalls[0].args[0].message.match(/stream MUST be a nonempty string/).length).equal(1);
  });
  it('invokes callback(error) if call.request.stream does not matches any writableStreamsPatterns', function () {
    var simulation = InMemorySimulation(data);
    var implementation = (0, _2.default)(_extends({}, simulation, {
      writableStreamsPatterns: ['^stream', 'test$']
    }));

    simulation.call.request = {
      stream: 'test-stream',
      events: [{ type: 'Test' }]
    };

    implementation.writeToStream(simulation.call, simulation.callback);
    var callbackCalls = simulation.callback.getCalls();
    (0, _asFunction2.default)(callbackCalls.length).equal(1);
    (0, _asFunction2.default)(callbackCalls[0].args.length).equal(1);
    (0, _asFunction2.default)(callbackCalls[0].args[0]).be.instanceof(Error);
    (0, _asFunction2.default)(callbackCalls[0].args[0].message.match(/stream is not writable/).length).equal(1);
  });
  it('invokes callback(error) if call.request.events is not a nonempty list of valid events to store', function () {
    var simulation = InMemorySimulation(data);
    var implementation = (0, _2.default)(simulation);

    // Empty list of events
    simulation.call.request = {
      stream: 'StreamX',
      events: []
    };
    implementation.writeToStream(simulation.call, simulation.callback);
    var callbackCalls = simulation.callback.getCalls();
    (0, _asFunction2.default)(callbackCalls.length).equal(1);
    (0, _asFunction2.default)(callbackCalls[0].args.length).equal(1);
    (0, _asFunction2.default)(callbackCalls[0].args[0]).be.instanceof(Error);
    (0, _asFunction2.default)(callbackCalls[0].args[0].message.match(/events MUST be a nonempty list of events to store/).length).equal(1);

    // Bad events in the list
    simulation = InMemorySimulation(data);
    simulation.call.request = {
      stream: 'StreamX',
      events: [{ type: 'type', data: 'data' }, { data: 'data' }]
    };
    implementation.writeToStream(simulation.call, simulation.callback);
    callbackCalls = simulation.callback.getCalls();
    (0, _asFunction2.default)(callbackCalls.length).equal(1);
    (0, _asFunction2.default)(callbackCalls[0].args.length).equal(1);
    (0, _asFunction2.default)(callbackCalls[0].args[0]).be.instanceof(Error);
    (0, _asFunction2.default)(callbackCalls[0].args[0].message.match(/all events MUST have a valid type/).length).equal(1);
  });
  it('invokes backend.storeEvents() with right parameters', function () {
    var simulation = InMemorySimulation(data);
    var implementation = (0, _2.default)(simulation);

    var stream = 'StreamX';
    var events = [{ type: 'TypeOne' }, { type: 'TypeTwo', data: 'two' }];
    var expectedVersionNumber = 10;
    simulation.call.request = {
      stream: stream,
      events: events,
      expectedVersionNumber: expectedVersionNumber
    };

    implementation.writeToStream(simulation.call, simulation.callback);
    var backendCalls = simulation.backend.storeEvents.getCalls();
    (0, _asFunction2.default)(backendCalls.length).equal(1);
    (0, _asFunction2.default)(backendCalls[0].args[0].writeRequests.length).equal(1);
    (0, _asFunction2.default)(backendCalls[0].args[0].writeRequests[0]).eql({
      stream: stream,
      events: events.map(function (e) {
        return _extends({
          data: ''
        }, e);
      }),
      expectedVersionNumber: expectedVersionNumber
    });
    (0, _asFunction2.default)(backendCalls[0].args[0].transactionId).be.a.String();
    (0, _asFunction2.default)(_shortid2.default.isValid(backendCalls[0].args[0].transactionId)).be.True();
  });
  it('invokes callback(err) if there is an error writing the events', function (done) {
    var simulation = InMemorySimulation(data);
    var implementation = (0, _2.default)(simulation);

    var errMsg = 'failure ' + (0, _shortid2.default)();
    simulation.call.request = {
      stream: 'StreamX',
      events: [{ type: 'TypeOne', data: 'one' }, { type: 'TypeTwo', data: errMsg }],
      expectedVersionNumber: 0
    };

    implementation.writeToStream(simulation.call, simulation.callback);
    setTimeout(function () {
      var callbackCalls = simulation.callback.getCalls();
      (0, _asFunction2.default)(callbackCalls.length).equal(1);
      (0, _asFunction2.default)(callbackCalls[0].args.length).equal(1);
      (0, _asFunction2.default)(callbackCalls[0].args[0]).be.instanceof(Error);
      (0, _asFunction2.default)(callbackCalls[0].args[0].message.match(new RegExp(errMsg)).length).equal(1);
      done();
    }, 5);
  });
  it('invokes callback(null, {events}) if the events writing is succcessful', function (done) {
    var simulation = InMemorySimulation(data);
    var implementation = (0, _2.default)(simulation);

    var stream = 'StreamX';
    var events = [{ type: 'TypeOne', data: 'one' }, { type: 'TypeTwo' }];
    var expectedStoredEvents = events.map(function (e, idx) {
      return _extends({
        id: '0' + idx,
        stream: stream,
        data: ''
      }, e);
    });
    simulation.call.request = {
      stream: stream,
      events: events,
      expectedVersionNumber: 0
    };

    implementation.writeToStream(simulation.call, simulation.callback);
    setTimeout(function () {
      var callbackCalls = simulation.callback.getCalls();
      (0, _asFunction2.default)(callbackCalls.length).equal(1);
      (0, _asFunction2.default)(callbackCalls[0].args.length).equal(2);
      (0, _asFunction2.default)(callbackCalls[0].args[0]).be.Null();
      (0, _asFunction2.default)(callbackCalls[0].args[1]).eql({ events: expectedStoredEvents });
      done();
    }, 5);
  });
  it('writes to a stream that matches any writableStreamsPatterns', function (done) {
    var simulation = InMemorySimulation(data);
    var implementation = (0, _2.default)(_extends({}, simulation, {
      writableStreamsPatterns: ['test', 'ssing$', 'S$']
    }));

    var stream = 'Stream-passing';
    var events = [{ type: 'TypeOne', data: 'one' }, { type: 'TypeTwo' }];
    var expectedStoredEvents = events.map(function (e, idx) {
      return _extends({
        id: '0' + idx,
        stream: stream,
        data: ''
      }, e);
    });
    simulation.call.request = {
      stream: stream,
      events: events,
      expectedVersionNumber: 0
    };

    implementation.writeToStream(simulation.call, simulation.callback);
    setTimeout(function () {
      var callbackCalls = simulation.callback.getCalls();
      (0, _asFunction2.default)(callbackCalls.length).equal(1);
      (0, _asFunction2.default)(callbackCalls[0].args.length).equal(2);
      (0, _asFunction2.default)(callbackCalls[0].args[0]).be.Null();
      (0, _asFunction2.default)(callbackCalls[0].args[1]).eql({ events: expectedStoredEvents });
      done();
    }, 5);
  });
});