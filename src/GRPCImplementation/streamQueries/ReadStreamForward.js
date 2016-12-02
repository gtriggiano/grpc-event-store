import { max, noop } from 'lodash'

import { isValidString, eventsStreamFromBackendEmitter } from '../../utils'

function ReadStreamForward ({backend}) {
  return (call) => {
    call.on('error', noop)

    let { stream, fromVersionNumber, limit } = call.request

    // Validate request
    if (!isValidString(stream)) return call.emit('error', new TypeError('stream should be a non empty string'))

    fromVersionNumber = max([0, fromVersionNumber])

    let params = {stream, fromVersionNumber}
    if (limit > 0) params.limit = limit

    let backendResults = backend.getEventsByStream(params)
    let eventsStream = eventsStreamFromBackendEmitter(backendResults)
    eventsStream.subscribe(
      evt => call.write(evt),
      err => call.emit('error', err),
      () => call.end()
    )
  }
}

export default ReadStreamForward
