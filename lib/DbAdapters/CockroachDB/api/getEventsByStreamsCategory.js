'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = getEventsByStreamsCategoryHOF;

var _eventemitter = require('eventemitter3');

var _eventemitter2 = _interopRequireDefault(_eventemitter);

var _eventRecordToDTO = require('../helpers/eventRecordToDTO');

var _eventRecordToDTO2 = _interopRequireDefault(_eventRecordToDTO);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function getEventsByStreamsCategoryHOF(getConnection, eventsTable) {
  return ({ streamsCategory, fromEventId, limit }) => {
    let queryString = `SELECT * FROM ${eventsTable}
                        WHERE id > $1
                        AND (stream = $2 OR stream LIKE $3)
                        ORDER BY id`;
    let queryParams = [fromEventId, streamsCategory, `${streamsCategory}::%`];

    if (limit) {
      queryString = `${queryString} LIMIT $4`;
      queryParams.push(limit);
    }

    let dbResults = new _eventemitter2.default();

    getConnection((err, { client, release } = {}) => {
      if (err) return dbResults.emit('error', err);

      let query = client.query(queryString, queryParams);

      query.on('row', row => dbResults.emit('event', (0, _eventRecordToDTO2.default)(row)));
      query.on('error', err => {
        dbResults.emit('error', err);
        query.removeAllListeners();
        release();
      });
      query.on('end', () => {
        dbResults.emit('end');
        query.removeAllListeners();
        release();
      });
    });

    return dbResults;
  };
}