'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = poolConnectionGetter;

var _pg = require('pg');

var _pg2 = _interopRequireDefault(_pg);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function poolConnectionGetter(poolConfig) {
  let connectionsPool = new _pg2.default.Pool(poolConfig);

  return function getConnection(callback) {
    connectionsPool.connect((err, client, release) => {
      if (err) return callback(err);
      callback(null, { client, release });
    });
  };
}