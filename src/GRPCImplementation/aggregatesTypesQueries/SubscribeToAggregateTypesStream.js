import { every } from 'lodash'

import { isValidString } from '../../utils'

function SubscribeToAggregateTypesStream ({store}) {
  return (call) => {
    let onClientTermination = () => call.end()
    call.on('end', () => onClientTermination())

    call.once('data', (request) => {
      let { aggregateTypes } = request

      // Validate request
      if (!aggregateTypes.length) return call.emit('error', new TypeError('aggregateTypes should contain one or more non empty strings'))
      if (!every(aggregateTypes, isValidString)) return call.emit('error', new TypeError('every item of aggregateTypes should be a non empty string'))

      let subscription = store.eventsStream
        .filter(({aggregateIdentity}) => !!~aggregateTypes.indexOf(aggregateIdentity.type))
        .subscribe(
          evt => call.write(evt),
          err => call.emit('error', err)
        )

      onClientTermination = () => {
        subscription.unsubscribe()
        call.end()
      }
    })
  }
}

export default SubscribeToAggregateTypesStream
