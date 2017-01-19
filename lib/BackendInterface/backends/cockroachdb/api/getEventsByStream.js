'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _eventemitter = require('eventemitter3');

var _eventemitter2 = _interopRequireDefault(_eventemitter);

var _eventRecordToDTO = require('../helpers/eventRecordToDTO');

var _eventRecordToDTO2 = _interopRequireDefault(_eventRecordToDTO);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function getEventsByStreamFactory(getConnection) {
  return function (_ref) {
    var stream = _ref.stream,
        fromVersionNumber = _ref.fromVersionNumber,
        limit = _ref.limit;

    var queryStr = 'SELECT * FROM events\n                    WHERE stream = $1\n                      AND versionNumber > $2\n                    ORDER BY id ';

    var queryParams = [stream, fromVersionNumber];

    if (limit) {
      queryStr += 'LIMIT $3';
      queryParams.push(limit);
    }

    var results = new _eventemitter2.default();

    getConnection(function (err, _ref2) {
      var client = _ref2.client,
          release = _ref2.release;

      if (err) return results.emit('error', err);

      var query = client.query(queryStr, queryParams);

      query.on('row', function (row) {
        return results.emit('event', (0, _eventRecordToDTO2.default)(row));
      });
      query.on('error', function (err) {
        results.emit('error', err);
        query.removeAllListeners();
        release();
      });
      query.on('end', function () {
        results.emit('end');
        query.removeAllListeners();
        release();
      });
    });

    return results;
  };
}

exports.default = getEventsByStreamFactory;