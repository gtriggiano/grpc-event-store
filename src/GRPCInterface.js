import path from 'path'
import grpc from 'grpc'
import EventEmitter from 'eventemitter3'

const PROTOCOL_FILE_PATH = path.resolve(__dirname, '..', 'GRPCEventStore.proto')
export const EventStoreProtocol = grpc.load(PROTOCOL_FILE_PATH).grpceventstore

import GRPCImplementation from './GRPCImplementation'
import { prefixString, isPositiveInteger, isListOfValidStrings } from './utils'

function GRPCInterface (_settings) {
  let settings = {...defaultSettings, ..._settings}
  _validateSettings(settings)

  let grpcInstance = new EventEmitter()

  // Settings
  let {
    port,
    credentials,
    writableStreamsPatterns,
    backend,
    store
  } = settings

  // Private API
  let _connected = false
  let _connecting = false
  let _disconnecting = false
  let _grpcServer = new grpc.Server()
  _grpcServer.addProtoService(EventStoreProtocol.EventStore.service, GRPCImplementation({backend, store, writableStreamsPatterns}))

  // Public API
  function connect () {
    if (_connected || _connecting || _disconnecting) return grpcInstance

    _connecting = true
    _grpcServer.bind(`0.0.0.0:${port}`, credentials)
    _grpcServer.start()
    grpcInstance.emit('connect')
    _connected = true
    _connecting = false
    return grpcInstance
  }
  function disconnect () {
    if (!_connected || _connecting || _disconnecting) return grpcInstance

    _disconnecting = true
    _grpcServer.tryShutdown(() => {
      _connected = false
      _disconnecting = false
      grpcInstance.emit('disconnect')
    })
    setTimeout(function () {
      if (!_connected) return
      _grpcServer.forceShutdown()
      _connected = false
      _disconnecting = false
      grpcInstance.emit('disconnect')
    }, 500)

    return grpcInstance
  }

  Object.defineProperty(grpcInstance, 'connect', {value: connect})
  Object.defineProperty(grpcInstance, 'disconnect', {value: disconnect})
  return grpcInstance
}

const defaultSettings = {
  port: 50051,
  credentials: grpc.ServerCredentials.createInsecure(),
  writableStreamsPatterns: false
}

const iMsg = prefixString('[gRPC EventStore GRPCInterface]: ')
function _validateSettings (settings) {
  let {
    port,
    credentials,
    writableStreamsPatterns
  } = settings

  if (!isPositiveInteger(port)) throw new TypeError(iMsg('settings.port should be a positive integer'))
  if (!(credentials instanceof grpc.ServerCredentials)) throw new TypeError(iMsg('settings.credentials should be an instance of grpc.ServerCredentials'))
  if (writableStreamsPatterns && !isListOfValidStrings(writableStreamsPatterns)) throw new TypeError(iMsg('settings.writableStreamsPatterns must be either false or an array of 0 or more regex expressions'))
}

export default GRPCInterface
