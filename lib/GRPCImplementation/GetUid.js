'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _shortid = require('shortid');

var _shortid2 = _interopRequireDefault(_shortid);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function GetUid() {
  return function (_, callback) {
    return callback(null, { uid: (0, _shortid2.default)() });
  };
}

exports.default = GetUid;