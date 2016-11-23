import { every, max, noop } from 'lodash'

import { isValidString, eventsStreamFromBackendEmitter } from '../../utils'

function ReadAggregateTypesStreamForwardFromEvent ({backend}) {
  return (call) => {
    call.on('error', noop)

    let {aggregateTypes, fromEventId, limit} = call.request

    // Validate request
    if (!aggregateTypes.length) return call.emit('error', new TypeError('aggregateTypes should contain one or more non empty strings'))
    if (!every(aggregateTypes, isValidString)) return call.emit('error', new TypeError('every item of aggregateTypes should be a non empty string'))

    fromEventId = max([0, fromEventId])

    let params = {aggregateTypes, fromEventId}
    if (limit > 0) params.limit = limit

    let backendResults = backend.getEventsByAggregateTypes(params)
    let eventsStream = eventsStreamFromBackendEmitter(backendResults)
    eventsStream.subscribe(
      evt => call.write(evt),
      err => call.emit('error', err),
      () => call.end()
    )
  }
}

export default ReadAggregateTypesStreamForwardFromEvent
