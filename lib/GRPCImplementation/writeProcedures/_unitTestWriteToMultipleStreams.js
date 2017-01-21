'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _asFunction = require('should/as-function');

var _asFunction2 = _interopRequireDefault(_asFunction);

var _shortid = require('shortid');

var _shortid2 = _interopRequireDefault(_shortid);

var _ = require('..');

var _2 = _interopRequireDefault(_);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

describe('.writeToMultipleStreams(call, callback)', function () {
  it('invokes callback(error) if !call.request.writeRequests.length', function () {
    var simulation = InMemorySimulation(data);
    var implementation = (0, _2.default)(simulation);

    simulation.call.request = {
      writeRequests: []
    };
    implementation.writeToMultipleStreams(simulation.call, simulation.callback);

    var callbackCalls = simulation.callback.getCalls();
    (0, _asFunction2.default)(callbackCalls.length).equal(1);
    (0, _asFunction2.default)(callbackCalls[0].args.length).equal(1);
    (0, _asFunction2.default)(callbackCalls[0].args[0]).be.an.instanceof(Error);
    (0, _asFunction2.default)(callbackCalls[0].args[0].message.match(/writeRequests should be a list of event storage requests/).length).equal(1);
  });
  it('invokes callback(error) if anyone of call.request.writeRequests is not a valid writeRequest', function () {
    var simulation = InMemorySimulation(data);
    var implementation = (0, _2.default)(simulation);

    // Missing stream
    simulation.call.request = {
      writeRequests: [{
        stream: '',
        events: [{ type: 'Test' }]
      }, {
        stream: 'StreamX',
        events: [{ type: 'Test' }]
      }]
    };
    implementation.writeToMultipleStreams(simulation.call, simulation.callback);
    var callbackCalls = simulation.callback.getCalls();
    (0, _asFunction2.default)(callbackCalls.length).equal(1);
    (0, _asFunction2.default)(callbackCalls[0].args.length).equal(1);
    (0, _asFunction2.default)(callbackCalls[0].args[0]).be.instanceof(Error);
    (0, _asFunction2.default)(callbackCalls[0].args[0].message.match(/stream MUST be a nonempty string/).length).equal(1);

    // Missing events
    simulation = InMemorySimulation(data);
    simulation.call.request = {
      writeRequests: [{
        stream: 'StreamX',
        events: [{ type: 'Test' }]
      }, {
        stream: 'StreamY'
      }]
    };
    implementation.writeToMultipleStreams(simulation.call, simulation.callback);
    callbackCalls = simulation.callback.getCalls();
    (0, _asFunction2.default)(callbackCalls.length).equal(1);
    (0, _asFunction2.default)(callbackCalls[0].args.length).equal(1);
    (0, _asFunction2.default)(callbackCalls[0].args[0]).be.instanceof(Error);
    (0, _asFunction2.default)(callbackCalls[0].args[0].message.match(/events MUST be a nonempty list of events to store/).length).equal(1);

    // Empty events
    simulation = InMemorySimulation(data);
    simulation.call.request = {
      writeRequests: [{
        stream: 'StreamX',
        events: [{ type: 'Test' }]
      }, {
        stream: 'StreamY',
        events: []
      }]
    };
    implementation.writeToMultipleStreams(simulation.call, simulation.callback);
    callbackCalls = simulation.callback.getCalls();
    (0, _asFunction2.default)(callbackCalls.length).equal(1);
    (0, _asFunction2.default)(callbackCalls[0].args.length).equal(1);
    (0, _asFunction2.default)(callbackCalls[0].args[0]).be.instanceof(Error);
    (0, _asFunction2.default)(callbackCalls[0].args[0].message.match(/events MUST be a nonempty list of events to store/).length).equal(1);

    // Bad event
    simulation = InMemorySimulation(data);
    simulation.call.request = {
      writeRequests: [{
        stream: 'StreamX',
        events: [{ type: 'Test' }]
      }, {
        stream: 'StreamY',
        events: [{ type: 'Test' }, { type: '' }]
      }]
    };
    implementation.writeToMultipleStreams(simulation.call, simulation.callback);
    callbackCalls = simulation.callback.getCalls();
    (0, _asFunction2.default)(callbackCalls.length).equal(1);
    (0, _asFunction2.default)(callbackCalls[0].args.length).equal(1);
    (0, _asFunction2.default)(callbackCalls[0].args[0]).be.instanceof(Error);
    (0, _asFunction2.default)(callbackCalls[0].args[0].message.match(/all events MUST have a valid type/).length).equal(1);

    // Not writable stream
    simulation = InMemorySimulation(data);
    implementation = (0, _2.default)(_extends({}, simulation, {
      writableStreamsPatterns: ['test', 'ssing$', 'Stream$']
    }));
    simulation.call.request = {
      writeRequests: [{
        stream: 'Stream-passing',
        events: [{ type: 'Test' }]
      }, {
        stream: 'Stream-failing',
        events: [{ type: 'Test' }, { type: '' }]
      }]
    };
    implementation.writeToMultipleStreams(simulation.call, simulation.callback);
    callbackCalls = simulation.callback.getCalls();
    (0, _asFunction2.default)(callbackCalls.length).equal(1);
    (0, _asFunction2.default)(callbackCalls[0].args.length).equal(1);
    (0, _asFunction2.default)(callbackCalls[0].args[0]).be.instanceof(Error);
    (0, _asFunction2.default)(callbackCalls[0].args[0].message.match(/stream is not writable/).length).equal(1);
  });
  it('invokes callback(error) if each writeRequest does not concern a different stream', function () {
    var simulation = InMemorySimulation(data);
    var implementation = (0, _2.default)(simulation);

    simulation.call.request = {
      writeRequests: [{
        stream: 'StreamX',
        events: [{ type: 'Test' }]
      }, {
        stream: 'StreamX',
        events: [{ type: 'TestTwo' }]
      }]
    };
    implementation.writeToMultipleStreams(simulation.call, simulation.callback);
    var callbackCalls = simulation.callback.getCalls();
    (0, _asFunction2.default)(callbackCalls.length).equal(1);
    (0, _asFunction2.default)(callbackCalls[0].args.length).equal(1);
    (0, _asFunction2.default)(callbackCalls[0].args[0]).be.instanceof(Error);
    (0, _asFunction2.default)(callbackCalls[0].args[0].message.match(/each writeRequest should concern a different stream/).length).equal(1);
  });
  it('invokes backend.storeEvents() with right parameters', function () {
    var simulation = InMemorySimulation(data);
    var implementation = (0, _2.default)(simulation);

    simulation.call.request = {
      writeRequests: [{
        stream: 'StreamX',
        events: [{ type: 'Test' }],
        expectedVersionNumber: 3
      }, {
        stream: 'StreamY',
        events: [{ type: 'TestTwo', data: 'hello' }],
        expectedVersionNumber: -10
      }]
    };
    implementation.writeToMultipleStreams(simulation.call, simulation.callback);
    var backendCalls = simulation.backend.storeEvents.getCalls();
    (0, _asFunction2.default)(backendCalls.length).equal(1);
    (0, _asFunction2.default)(backendCalls[0].args[0].writeRequests.length).equal(2);
    (0, _asFunction2.default)(backendCalls[0].args[0].writeRequests).eql([{
      stream: 'StreamX',
      events: [{ type: 'Test', data: '' }],
      expectedVersionNumber: 3
    }, {
      stream: 'StreamY',
      events: [{ type: 'TestTwo', data: 'hello' }],
      expectedVersionNumber: -2
    }]);
    (0, _asFunction2.default)(backendCalls[0].args[0].transactionId).be.a.String();
    (0, _asFunction2.default)(_shortid2.default.isValid(backendCalls[0].args[0].transactionId)).be.True();
  });
  it('invokes callback(err) if there is an error executing any of the writeRequests', function (done) {
    var simulation = InMemorySimulation(data);
    var implementation = (0, _2.default)(simulation);

    var errMsg = 'failure ' + (0, _shortid2.default)();
    simulation.call.request = {
      writeRequests: [{
        stream: 'StreamX',
        events: [{ type: 'Test' }],
        expectedVersionNumber: 3
      }, {
        stream: 'StreamY',
        events: [{ type: 'TestTwo', data: errMsg }],
        expectedVersionNumber: -10
      }]
    };

    implementation.writeToMultipleStreams(simulation.call, simulation.callback);
    setTimeout(function () {
      var callbackCalls = simulation.callback.getCalls();
      (0, _asFunction2.default)(callbackCalls.length).equal(1);
      (0, _asFunction2.default)(callbackCalls[0].args.length).equal(1);
      (0, _asFunction2.default)(callbackCalls[0].args[0]).be.instanceof(Error);
      (0, _asFunction2.default)(callbackCalls[0].args[0].message.match(new RegExp(errMsg)).length).equal(1);
      done();
    }, 5);
  });
  it('invokes callback(null, {events}) if the events writing is successful', function (done) {
    var simulation = InMemorySimulation(data);
    var implementation = (0, _2.default)(simulation);

    simulation.call.request = {
      writeRequests: [{
        stream: 'StreamX',
        events: [{ type: 'Test' }],
        expectedVersionNumber: 3
      }, {
        stream: 'StreamY',
        events: [{ type: 'TestTwo', data: 'hello' }],
        expectedVersionNumber: -2
      }]
    };

    implementation.writeToMultipleStreams(simulation.call, simulation.callback);
    setTimeout(function () {
      var callbackCalls = simulation.callback.getCalls();
      (0, _asFunction2.default)(callbackCalls.length).equal(1);
      (0, _asFunction2.default)(callbackCalls[0].args.length).equal(2);
      (0, _asFunction2.default)(callbackCalls[0].args[0]).be.Null();
      (0, _asFunction2.default)(callbackCalls[0].args[1]).eql({
        events: simulation.call.request.writeRequests.reduce(function (storedEvents, request, rIdx) {
          return storedEvents.concat(request.events.map(function (e, eIdx) {
            return _extends({
              id: '' + rIdx + eIdx,
              stream: request.stream,
              data: ''
            }, e);
          }));
        }, [])
      });
      done();
    }, 5);
  });
});