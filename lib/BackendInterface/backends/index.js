'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _cockroachdb = require('./cockroachdb');

var _cockroachdb2 = _interopRequireDefault(_cockroachdb);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var backends = {
  cockroachdb: _cockroachdb2.default
};

exports.default = backends;