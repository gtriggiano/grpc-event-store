'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _lodash = require('lodash');

var _utils = require('../../utils');

var _poolConnectionGetter = require('./helpers/poolConnectionGetter');

var _poolConnectionGetter2 = _interopRequireDefault(_poolConnectionGetter);

var _appendEvents = require('./api/appendEvents');

var _appendEvents2 = _interopRequireDefault(_appendEvents);

var _getEvents = require('./api/getEvents');

var _getEvents2 = _interopRequireDefault(_getEvents);

var _getEventsByStream = require('./api/getEventsByStream');

var _getEventsByStream2 = _interopRequireDefault(_getEventsByStream);

var _getEventsByStreamsCategory = require('./api/getEventsByStreamsCategory');

var _getEventsByStreamsCategory2 = _interopRequireDefault(_getEventsByStreamsCategory);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function CockroachDBAdapter(config = {}) {
  let _config = _extends({}, defaultConfig, config);
  validateConfig(_config);

  let host = _config.host,
      port = _config.port,
      database = _config.database,
      table = _config.table,
      user = _config.user,
      maxPoolClients = _config.maxPoolClients,
      minPoolClients = _config.minPoolClients,
      idleTimeoutMillis = _config.idleTimeoutMillis;


  let getConnection = (0, _poolConnectionGetter2.default)({
    host,
    port,
    database,
    user,
    max: maxPoolClients,
    min: minPoolClients,
    idleTimeoutMillis
  });

  return Object.defineProperties({}, {
    appendEvents: {
      value: (0, _appendEvents2.default)(getConnection, table),
      enumerable: true
    },
    getEvents: {
      value: (0, _getEvents2.default)(getConnection, table),
      enumerable: true
    },
    getEventsByStream: {
      value: (0, _getEventsByStream2.default)(getConnection, table),
      enumerable: true
    },
    getEventsByStreamsCategory: {
      value: (0, _getEventsByStreamsCategory2.default)(getConnection, table),
      enumerable: true
    }
  });
}

const defaultConfig = {
  host: 'localhost',
  port: 26257,
  database: 'eventstore',
  table: 'events',
  user: 'root',
  maxPoolClients: 10,
  minPoolClients: undefined,
  idleTimeoutMillis: 1000
};

const prefix = (0, _utils.prefixedString)('[grpc Event Store CockroachDBAdapter] ');
const validateConfig = ({
  host,
  port,
  database,
  table,
  user,
  maxPoolClients,
  minPoolClients,
  idleTimeoutMillis
}) => {
  if (!(0, _lodash.isString)(host) || (0, _lodash.isEmpty)(host)) throw new TypeError(prefix(`config.host MUST be a non empty string. Received ${host}`));
  if (!(0, _lodash.isInteger)(port) || port < 1) throw new TypeError(prefix(``));
  if (!(0, _lodash.isString)(database) || (0, _lodash.isEmpty)(database)) throw new TypeError(prefix(`config.database MUST be a non empty string. Received ${database}`));
  if (!(0, _lodash.isString)(table) || (0, _lodash.isEmpty)(table)) throw new TypeError(prefix(`config.table MUST be a non empty string. Received ${table}`));
  if (!(0, _lodash.isString)(user) || (0, _lodash.isEmpty)(user)) throw new TypeError(prefix(`config.user MUST be a non empty string. Received ${user}`));
  if (!(0, _lodash.isInteger)(maxPoolClients) || maxPoolClients < 1) throw new TypeError(prefix(`config.maxPoolClients MUST be a positive integer. Received ${maxPoolClients}`));
  if (minPoolClients && (!(0, _lodash.isInteger)(minPoolClients) || minPoolClients > maxPoolClients || minPoolClients < 1)) throw new TypeError(prefix(`config.minPoolClients MUST be a positive integer lower than config.maxPoolClients. Received ${minPoolClients}`));
  if (!(0, _lodash.isInteger)(idleTimeoutMillis) || idleTimeoutMillis < 1000) throw new TypeError(prefix(`config.idleTimeoutMillis MUST be a positive integer higher then 999. Received ${idleTimeoutMillis}`));
};

let createTableSQL;
Object.defineProperty(CockroachDBAdapter, 'createTableSQL', {
  value: (tableName = 'events') => {
    if (!createTableSQL) {
      createTableSQL = _fs2.default.readFileSync(_path2.default.resolve(__dirname, 'createTable.sql'), 'utf8');
    }
    return createTableSQL.replace('events', tableName);
  },
  enumerable: true
});

exports.default = CockroachDBAdapter;