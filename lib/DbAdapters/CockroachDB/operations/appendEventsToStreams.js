'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = appendEventsToStreams;

var _lodash = require('lodash');

var _eventRecordToDTO = require('../helpers/eventRecordToDTO');

var _eventRecordToDTO2 = _interopRequireDefault(_eventRecordToDTO);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function appendEventsToStreams({
  client,
  eventsTable,
  eventsToAppend,
  transactionId
}) {
  return new Promise((resolve, reject) => {
    let eventsParamsLists = eventsToAppend.map(({ stream, type, data, versionNumber }) => [stream, type, data, versionNumber, transactionId]);

    let queryPlaceholders = eventsParamsLists.map((list, listIdx) => {
      let placeholders = list.map((_, itemIdx) => `$${itemIdx + 1 + listIdx * list.length}`);
      return `(${placeholders.join(',')})`;
    }).join(',');

    let queryString = `
      INSERT INTO ${eventsTable}
        (
          stream,
          type,
          data,
          versionNumber,
          transactionId
        )
      VALUES ${queryPlaceholders}
      RETURNING *
    `;

    let queryParams = (0, _lodash.flatten)(eventsParamsLists);

    client.query(queryString, queryParams, (err, result) => {
      if (err) return reject(err);
      resolve(result.rows.map(_eventRecordToDTO2.default));
    });
  });
}