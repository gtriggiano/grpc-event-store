'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = getEventsByStreamHOF;

var _eventemitter = require('eventemitter3');

var _eventemitter2 = _interopRequireDefault(_eventemitter);

var _eventRecordToDTO = require('../helpers/eventRecordToDTO');

var _eventRecordToDTO2 = _interopRequireDefault(_eventRecordToDTO);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function getEventsByStreamHOF(getConnection, eventsTable) {
  return ({ stream, fromVersionNumber, limit }) => {
    let queryString = `SELECT * FROM ${eventsTable}
                        WHERE stream = $1
                        AND versionNumber > $2
                        ORDER BY id`;

    let queryParams = [stream, fromVersionNumber];

    if (limit) {
      queryString = `${queryString} LIMIT $3`;
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