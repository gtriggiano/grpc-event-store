'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = getStreamVersionNumber;

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function getStreamVersionNumber(client, stream) {
  return new _bluebird2.default(function (resolve, reject) {
    client.query('SELECT COUNT(*) AS versionNumber FROM events\n       WHERE stream = $1', [stream], function (err, result) {
      if (err) return reject(err);
      var versionNumber = result.rows[0].versionNumber;

      resolve(parseInt(versionNumber, 10));
    });
  });
}