import EventEmitter from 'eventemitter3'

export default function SimpleStoreBus () {
  let bus = new EventEmitter()
  bus.publish = (eventsString) => {
    bus.emit('newEvents', eventsString)
  }
  bus.safeOrderTimeframe = null
  return bus
}
