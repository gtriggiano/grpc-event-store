"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
function Ping() {
  return function (_, callback) {
    return callback(null, {});
  };
}

exports.default = Ping;