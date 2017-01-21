import { merge, isArray } from 'lodash'
import EventEmitter from 'eventemitter3'
import { DNSNode, ExternalNode } from 'dnsmq-messagebus'

import { prefixString, isValidString, isPositiveInteger, eventsStreamFromBus } from './utils'

function StoreInterface (_settings) {
  let settings = merge({}, defaultSettings, _settings)
  _validateSettings(settings)

  let {
    busDNS,
    busExternalNode,
    busCoordinationPort,
    busExternalUpdatesPort
  } = settings

  let store = new EventEmitter()

  // Private API
  const isExternalNode = !!busExternalNode
  const BusNodeFactory = isExternalNode ? ExternalNode : DNSNode
  let _bus = BusNodeFactory(busDNS, {
    coordinationPort: busCoordinationPort,
    externalUpdatesPort: busExternalUpdatesPort
  })
  let _eventsStream = eventsStreamFromBus(_bus, 50)
  _bus.subscribe('StoredEvents')
  _bus.on('connect', () => store.emit('connect'))
  _bus.on('disconnect', () => store.emit('disconnect'))

  // Public API
  function connect () {
    _bus.connect()
  }
  function disconnect () {
    _bus.disconnect()
  }
  function publishEvents (events) {
    let eventsString = JSON.stringify(isArray(events) ? events : [events])
    _bus.publish('StoredEvents', eventsString)
  }

  Object.defineProperty(store, 'eventsStream', {value: _eventsStream})
  Object.defineProperty(store, 'connect', {value: connect})
  Object.defineProperty(store, 'disconnect', {value: disconnect})
  Object.defineProperty(store, 'publishEvents', {value: publishEvents})
  return store
}

const defaultSettings = {
  busDNS: 'localhost',
  busExternalNode: false,
  busCoordinationPort: 50061,
  busExternalUpdatesPort: 50081
}

const iMsg = prefixString('[gRPC EventStore StoreInterface]: ')
function _validateSettings (settings) {
  let {
    busDNS,
    busExternalNode,
    busCoordinationPort,
    busExternalUpdatesPort
  } = settings

  if (!isValidString(busDNS)) throw new TypeError(iMsg('settings.busDNS should be a valid string'))
  const isExternalNode = !!busExternalNode
  if (!isExternalNode) {
    if (!isPositiveInteger(busCoordinationPort)) throw new TypeError(iMsg('settings.busCoordinationPort should be a positive integer'))
  }
  if (!isPositiveInteger(busExternalUpdatesPort)) throw new TypeError(iMsg('settings.busExternalUpdatesPort should be a positive integer'))
}

export default StoreInterface
