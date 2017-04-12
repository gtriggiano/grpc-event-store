'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports.default = getStreamsVersionNumbers;
function getStreamsVersionNumbers({
  client,
  eventsTable,
  streams
}) {
  return new Promise((resolve, reject) => {
    let queryString = `
      SELECT stream, count(stream) AS version FROM ${eventsTable}
      WHERE stream IN (${streams.map((_, idx) => `$${idx + 1}`).join(',')})
      GROUP BY stream
    `;

    client.query(queryString, streams, (err, result) => {
      if (err) return reject(err);
      let streamsVersionsMap = result.rows.reduce((map, row) => _extends({}, map, {
        [row.stream]: parseInt(row.version, 10)
      }), {});

      streams.forEach(stream => {
        streamsVersionsMap[stream] = streamsVersionsMap[stream] || 0;
      });

      resolve(streamsVersionsMap);
    });
  });
}