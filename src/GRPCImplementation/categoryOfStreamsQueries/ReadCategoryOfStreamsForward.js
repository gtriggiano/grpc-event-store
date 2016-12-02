import { max, noop } from 'lodash'

import { isValidString, eventsStreamFromBackendEmitter } from '../../utils'

function ReadCategoryOfStreamsForward ({backend}) {
  return (call) => {
    call.on('error', noop)

    let {streamsCategory, fromEventId, limit} = call.request

    // Validate request
    if (!isValidString(streamsCategory)) return call.emit('error', new TypeError('streamsCategory should be a non empty string'))

    fromEventId = max([0, fromEventId])

    let params = {streamsCategory, fromEventId}
    if (limit > 0) params.limit = limit

    let backendResults = backend.getEventsByStreamCategory(params)
    let eventsStream = eventsStreamFromBackendEmitter(backendResults)
    eventsStream.subscribe(
      evt => call.write(evt),
      err => call.emit('error', err),
      () => call.end()
    )
  }
}

export default ReadCategoryOfStreamsForward
