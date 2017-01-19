'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _lodash = require('lodash');

var _eventemitter = require('eventemitter3');

var _eventemitter2 = _interopRequireDefault(_eventemitter);

var _getStreamVersionNumber = require('../operations/getStreamVersionNumber');

var _getStreamVersionNumber2 = _interopRequireDefault(_getStreamVersionNumber);

var _storeStreamEvents = require('../operations/storeStreamEvents');

var _storeStreamEvents2 = _interopRequireDefault(_storeStreamEvents);

var _transactionWrapper = require('../helpers/transactionWrapper');

var _transactionWrapper2 = _interopRequireDefault(_transactionWrapper);

var _utils = require('../../../../utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function storeEventsFactory(getConnection) {
  return function (_ref) {
    var writeRequests = _ref.writeRequests,
        transactionId = _ref.transactionId;

    var results = new _eventemitter2.default();

    getConnection(function (err, _ref2) {
      var client = _ref2.client,
          release = _ref2.release;

      if (err) return results.emit('error', err);
      (0, _transactionWrapper2.default)(client, function (client, done) {
        Promise.resolve().then(function () {
          var responses = [];
          return writeRequests.reduce(function (previousRequest, req) {
            var request = req;
            return previousRequest.then(function () {
              return writeToAggregateStream(client, request, transactionId).then(function (response) {
                return responses.push(response);
              });
            });
          }, Promise.resolve()).then(function () {
            return responses;
          });
        }).then(function (responses) {
          var errors = responses.filter(function (response) {
            return response instanceof Error;
          });
          if (errors.length) {
            var errorsMessages = errors.map(function (_ref3) {
              var message = _ref3.message;
              return message;
            }).join(', ');
            throw new Error('Events writing failed because of the following errors: ' + errorsMessages);
          }
          return (0, _lodash.flatten)(responses);
        }).then(function (storedEvents) {
          return done(null, storedEvents);
        }).catch(done);
      }, function (err, storedEvents) {
        release();
        if (err) return results.emit('error', err);
        results.emit('storedEvents', storedEvents);
      });
    });

    return results;
  };
}

function writeToAggregateStream(client, request, transactionId) {
  var stream = request.stream,
      expectedVersionNumber = request.expectedVersionNumber,
      events = request.events;


  var eMsg = (0, _utils.prefixString)('Stream ' + stream + ' ');

  var noConsistencyRequired = expectedVersionNumber === -2;
  var streamShouldJustExist = expectedVersionNumber === -1;

  return (0, _getStreamVersionNumber2.default)(client, stream).then(function (actualVersionNumber) {
    var streamExists = !!actualVersionNumber;

    if (noConsistencyRequired) return actualVersionNumber;
    if (streamShouldJustExist && !streamExists) throw new Error(eMsg('does not exist'));

    if (actualVersionNumber !== expectedVersionNumber) throw new Error(eMsg('version mismatch'));

    return actualVersionNumber;
  }).then(function (actualVersionNumber) {
    return (0, _storeStreamEvents2.default)(client, stream, actualVersionNumber, events, transactionId);
  }).catch(function (error) {
    return error;
  });
}

exports.default = storeEventsFactory;