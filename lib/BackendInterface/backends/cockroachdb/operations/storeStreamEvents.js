'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = storeStreamEvents;

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _lodash = require('lodash');

var _eventRecordToDTO = require('../helpers/eventRecordToDTO');

var _eventRecordToDTO2 = _interopRequireDefault(_eventRecordToDTO);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function storeStreamEvents(client, stream, actualVersionNumber, events, transactionId) {
  return new _bluebird2.default(function (resolve, reject) {
    var parametersList = events.map(function (_ref, idx) {
      var type = _ref.type,
          data = _ref.data;
      return [stream, type, actualVersionNumber + idx + 1, new Buffer(data, 'utf8'), transactionId];
    });

    var queryPlaceholders = parametersList.map(function (parameters, idx) {
      var placeholders = (0, _lodash.range)(1, parameters.length + 1).map(function (n) {
        return n + idx * parameters.length;
      }).map(function (n) {
        return '$' + n;
      });
      return '(' + placeholders.join(', ') + ')';
    });

    var insertQueryString = '\n      INSERT INTO events\n        (\n          stream,\n          type,\n          versionNumber,\n          data,\n          transactionId\n        )\n      VALUES ' + queryPlaceholders.join(', ') + '\n      RETURNING *';

    // Write events
    client.query(insertQueryString, (0, _lodash.flatten)(parametersList), function (err, result) {
      if (err) return reject(err);
      resolve(result.rows.map(_eventRecordToDTO2.default));
    });
  });
}