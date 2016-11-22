import { noop } from 'lodash'
import EventEmitter from 'eventemitter3'

function FixtureBus () {
  let bus = new EventEmitter()
  Object.assign(bus, {
    connect: noop,
    disconnect: noop,
    publish: noop,
    subscribe: noop,
    unsubscribe: noop
  })
  return bus
}

export default FixtureBus
