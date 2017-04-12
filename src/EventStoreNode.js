import grpc from 'grpc'
import EventEmitter from 'eventemitter3'

import GRPCServer from './GRPCServer'
import SimpleStoreBus from './SimpleStoreBus'
import {
  prefixedString,
  isPositiveInteger,
  isArrayOfNotEmptyStrings,
  areValidGRPCCredentials,
  hasDbAdapterInterface,
  hasStoreBusInterface,
  stringMatchesSomeRegex,
  eventsStreamFromStoreBus
} from './utils'

export default function EventStoreNode (config) {
  let node = new EventEmitter()

  let _config = {...defaultConfig, ...config}
  validateConfig(_config)
  let {
    port,
    credentials,
    dbAdapter,
    storeBus,
    writableStreamsPatterns
  } = _config

  let _grpcServer = null
  let _stopping = false

  let eventsStream = eventsStreamFromStoreBus(storeBus)
  let onEventsStored = (events) => {
    let eventsString = JSON.stringify(events)
    storeBus.publish(eventsString)
  }
  let isStreamWritable = stringMatchesSomeRegex(writableStreamsPatterns.map(str => new RegExp(str)))

  return Object.defineProperties(node, {
    start: {value: () => {
      if (_grpcServer) return node
      _grpcServer = GRPCServer({
        port,
        credentials,
        eventsStream,
        onEventsStored,
        isStreamWritable,
        db: dbAdapter
      })
      node.emit('start')
      return node
    }},
    stop: {value: () => {
      if (!_grpcServer || _stopping) return node
      _stopping = true
      _grpcServer.tryShutdown(() => {
        _stopping = false
        _grpcServer = null
        node.emit('stop')
      })
      setTimeout(() => {
        if (!_grpcServer) return
        _grpcServer.forceShutdown()
      }, 2000)
      return node
    }},
    server: {get: () => _grpcServer}
  })
}

const defaultConfig = {
  port: 50051,
  credentials: grpc.ServerCredentials.createInsecure(),
  storeBus: SimpleStoreBus(),
  writableStreamsPatterns: null
}

const prefix = prefixedString('[grpc Event Store] ')
const validateConfig = ({
  port,
  credentials,
  storeBus,
  dbAdapter,
  writableStreamsPatterns
}) => {
  if (!isPositiveInteger(port)) throw new TypeError(prefix(`config.port MUST be a positive integer. Received ${port}`))
  if (!areValidGRPCCredentials(credentials)) throw new TypeError(prefix('config.credentials MUST be a valid grpc server credentials object'))
  if (!hasStoreBusInterface(storeBus)) throw new TypeError(prefix(`the provided config.storeBus does not have the expected interface`))
  if (!dbAdapter) throw new TypeError(prefix('you MUST provide a dbAdapter to the EventStoreNode constructor'))
  if (!hasDbAdapterInterface(dbAdapter)) throw new TypeError(prefix('config.dbAdapter does not provide the expected interface'))
  if (
    writableStreamsPatterns &&
    !isArrayOfNotEmptyStrings(writableStreamsPatterns)
  ) throw new TypeError(prefix('config.writableStreamsPatterns MUST be either falsy or an array of 0 or more strings'))
}
