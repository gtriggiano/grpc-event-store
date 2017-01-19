'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _pg = require('pg');

var _pg2 = _interopRequireDefault(_pg);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function setupConnectionsPool(poolConfig) {
  var _connectionsPool = new _pg2.default.Pool(poolConfig);

  return function getConnection(callback) {
    _connectionsPool.connect(function (err, client, release) {
      if (err) return callback(err);
      callback(null, { client: client, release: release });
    });
  };
}

exports.default = setupConnectionsPool;