import net from 'net'
import { forEach } from 'lodash'

import apiHandlersFactories from './api'
import setupConnectionsPool from './helpers/setupConnectionsPool'
import setupDatabase from './operations/setup'
import { prefixString, isValidString, isValidHostname, isPositiveInteger } from './../../../utils'

function CockroachDBBackend (_settings) {
  let settings = {...defaultSettings, ..._settings}
  _validateSettings(settings)

  let getConnection = setupConnectionsPool(settings)

  let backend = {}

  // Public API
  function setup (done) {
    getConnection((err, {client, release} = {}) => {
      if (err) return done(err)
      setupDatabase(client)
        .then(() => done())
        .catch(err => done(err))
        .then(() => release())
    })
  }

  Object.defineProperty(backend, 'setup', {value: setup})
  Object.defineProperty(backend, 'settings', {get: () => ({...settings})})
  forEach(apiHandlersFactories, (factory, handlerName) => {
    Object.defineProperty(backend, handlerName, {value: factory(getConnection)})
  })
  return backend
}

const defaultSettings = {
  host: 'localhost',
  port: 26257,
  database: 'eventstore',
  user: 'root',
  max: 10,
  idleTimeoutMillis: 30000
}

const iMsg = prefixString('[gRPC EventStore Backend CockroachDB]: ')
function _validateSettings (settings) {
  let {
    host,
    port,
    database,
    user,
    max,
    idleTimeoutMillis
  } = settings

  if (!isValidHostname(host) && !net.isIPv4(host)) throw new TypeError(iMsg('settings.host should be a valid hostname or IPv4 address'))
  if (!isPositiveInteger(port)) throw new TypeError(iMsg('settings.port should be a positive integer'))
  if (!isValidString(database)) throw new TypeError(iMsg('settings.database should be a valid string'))
  if (!isValidString(user)) throw new TypeError(iMsg('settings.user should be a valid string'))
  if (!isPositiveInteger(max)) throw new TypeError(iMsg('settings.max should be a positive integer'))
  if (!isPositiveInteger(idleTimeoutMillis)) throw new TypeError(iMsg('settings.idleTimeoutMillis should be a positive integer'))
}

export default CockroachDBBackend
