import { isInteger } from 'lodash'
import EventEmitter from 'eventemitter3'

import BackendInterface from './BackendInterface'
import GRPCInterface from './GRPCInterface'
import StoreInterface from './StoreInterface'
import { prefixString, timeoutCallback } from './utils'

function ServiceNode (_settings) {
  let settings = {...defaultSettings, ..._settings}
  _validateSettings(settings)

  let node = new EventEmitter()

  let {
    port,
    backendSetupTimeout,
    credentials,
    backend,
    writableStreamsPatterns
  } = settings

  // Private API
  let _connected = false
  let _connecting = false
  let _disconnecting = false
  let _backend = BackendInterface(backend || {})
  let _backendSetupTimeout = timeoutCallback(backendSetupTimeout, iMsg(`Backend setup timeout.`))
  let _store = StoreInterface(settings)
  let _grpcServer = GRPCInterface({
    backend: _backend,
    store: _store,
    writableStreamsPatterns,
    ...(port ? {port} : {}),
    ...(credentials ? {credentials} : {})
  })

  // Public api
  function connect () {
    if (_connected || _connecting || _disconnecting) return node
    _connecting = true

    _backend.setup(_backendSetupTimeout((err) => {
      if (err) {
        _connecting = false
        node.emit('error', err)
        console.error(err)
        return
      }
      _store.once('connect', () => _grpcServer.connect())
      _grpcServer.once('connect', () => {
        _connected = true
        _connecting = false
        node.emit('connect')
      })
      _store.connect()
    }))
    return node
  }
  function disconnect () {
    if (!_connected || _connecting || _disconnecting) return node
    _disconnecting = true

    _grpcServer.once('disconnect', () => _store.disconnect())
    _store.once('disconnect', () => {
      _connected = false
      _disconnecting = true
      node.emit('disconnect')
    })
    _grpcServer.disconnect()
    return node
  }

  Object.defineProperty(node, 'connect', {value: connect})
  Object.defineProperty(node, 'disconnect', {value: disconnect})
  return node
}

const defaultSettings = {
  busDNS: 'localhost',
  busExternalNode: false,
  busCoordinationPort: 50061,
  busExternalUpdatesPort: 50081,
  backendSetupTimeout: 1000
  /*
  port
  credentials
  backend
  */
}

const iMsg = prefixString('[gRPC EventStore ServiceNode]: ')
function _validateSettings (settings) {
  let {
    backendSetupTimeout
  } = settings

  if (!isInteger(backendSetupTimeout) || backendSetupTimeout < 1) throw new TypeError(iMsg('settings.setupTimeout should be a positive integer'))
  if (backendSetupTimeout < 500) console.warn(iMsg('a value of less than 500 msec for settings.backendSetupTimeout could affect the right functioning of the EventStore backend'))
}

ServiceNode.customBackend = BackendInterface.customBackend

export default ServiceNode
