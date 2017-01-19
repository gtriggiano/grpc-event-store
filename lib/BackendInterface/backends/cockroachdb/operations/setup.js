'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var setupSQLFile = __dirname + '/setup.sql';

function setupDatabase(client) {
  return new _bluebird2.default(function (resolve, reject) {
    _fs2.default.readFile(setupSQLFile, function (err, setupQuery) {
      if (err) return reject(err);
      client.query(setupQuery.toString(), function (err) {
        if (err) return reject(err);
        resolve();
      });
    });
  });
}

exports.default = setupDatabase;