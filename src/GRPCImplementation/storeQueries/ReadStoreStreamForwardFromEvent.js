import { max, noop } from 'lodash'

import { eventsStreamFromBackendEmitter } from '../../utils'

function ReadStoreStreamForwardFromEvent ({backend}) {
  return (call) => {
    call.on('error', noop)

    let {fromEventId, limit} = call.request

    fromEventId = max([0, fromEventId])

    let params = {fromEventId}
    if (limit > 0) params.limit = limit

    let backendResults = backend.getEvents(params)
    let eventsStream = eventsStreamFromBackendEmitter(backendResults)
    eventsStream.subscribe(
      evt => call.write(evt),
      err => call.emit('error', err),
      () => call.end()
    )
  }
}

export default ReadStoreStreamForwardFromEvent
