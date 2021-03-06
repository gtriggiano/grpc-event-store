import fs from 'fs'
import path from 'path'
import {
  isString,
  isInteger,
  isEmpty,
  isObject
} from 'lodash'

import {
  prefixedString
} from '../../utils'

import poolConnectionGetter from './helpers/poolConnectionGetter'

import appendEvents from './api/appendEvents'
import getEvents from './api/getEvents'
import getEventsByStream from './api/getEventsByStream'
import getEventsByStreamsCategory from './api/getEventsByStreamsCategory'

function CockroachDBAdapter (config = {}) {
  let _config = {...defaultConfig, ...config}
  validateConfig(_config)

  let {
    host,
    port,
    database,
    table,
    user,
    maxPoolClients,
    minPoolClients,
    idleTimeoutMillis,
    ssl
  } = _config

  let getConnection = poolConnectionGetter({
    host,
    port,
    database,
    user,
    max: maxPoolClients,
    min: minPoolClients,
    idleTimeoutMillis,
    ...(ssl ? {ssl} : {})
  })

  return Object.defineProperties({}, {
    appendEvents: {
      value: appendEvents(getConnection, table),
      enumerable: true
    },
    getEvents: {
      value: getEvents(getConnection, table),
      enumerable: true
    },
    getEventsByStream: {
      value: getEventsByStream(getConnection, table),
      enumerable: true
    },
    getEventsByStreamsCategory: {
      value: getEventsByStreamsCategory(getConnection, table),
      enumerable: true
    }
  })
}

const defaultConfig = {
  host: 'localhost',
  port: 26257,
  database: 'eventstore',
  table: 'events',
  user: 'root',
  maxPoolClients: 10,
  minPoolClients: undefined,
  idleTimeoutMillis: 1000,
  ssl: undefined
}

const prefix = prefixedString('[grpc Event Store CockroachDBAdapter] ')
const validateConfig = ({
  host,
  port,
  database,
  table,
  user,
  maxPoolClients,
  minPoolClients,
  idleTimeoutMillis,
  ssl
}) => {
  if (!isString(host) || isEmpty(host)) throw new TypeError(prefix(`config.host MUST be a non empty string. Received ${host}`))
  if (!isInteger(port) || port < 1) throw new TypeError(prefix(``))
  if (!isString(database) || isEmpty(database)) throw new TypeError(prefix(`config.database MUST be a non empty string. Received ${database}`))
  if (!isString(table) || isEmpty(table)) throw new TypeError(prefix(`config.table MUST be a non empty string. Received ${table}`))
  if (!isString(user) || isEmpty(user)) throw new TypeError(prefix(`config.user MUST be a non empty string. Received ${user}`))
  if (!isInteger(maxPoolClients) || maxPoolClients < 1) throw new TypeError(prefix(`config.maxPoolClients MUST be a positive integer. Received ${maxPoolClients}`))
  if (minPoolClients && (!isInteger(minPoolClients) || minPoolClients > maxPoolClients || minPoolClients < 1)) throw new TypeError(prefix(`config.minPoolClients MUST be a positive integer lower than config.maxPoolClients. Received ${minPoolClients}`))
  if (!isInteger(idleTimeoutMillis) || idleTimeoutMillis < 1000) throw new TypeError(prefix(`config.idleTimeoutMillis MUST be a positive integer higher then 999. Received ${idleTimeoutMillis}`))
  if (ssl !== undefined) {
    let eMsg = prefix(`config.ssl MUST be either undefined or an object. {ca: String, cert: String, key: String}`)
    if (!isObject(ssl)) throw new TypeError(eMsg)
    if (!isString(ssl.ca) || isEmpty(ssl.ca)) throw new TypeError(eMsg)
    if (!isString(ssl.cert) || isEmpty(ssl.cert)) throw new TypeError(eMsg)
    if (!isString(ssl.key) || isEmpty(ssl.key)) throw new TypeError(eMsg)
  }
}

let createTableSQL
Object.defineProperty(CockroachDBAdapter, 'createTableSQL', {
  value: (tableName = 'events') => {
    if (!createTableSQL) {
      createTableSQL = fs.readFileSync(path.resolve(__dirname, 'createTable.sql'), 'utf8')
    }
    return createTableSQL.replace('events', tableName)
  },
  enumerable: true
})

export default CockroachDBAdapter
