import {
  noop,
  max
} from 'lodash'

import { eventsStreamFromDbEmitter } from '../../utils'

export default function ReadStoreForward ({
  db
}) {
  return (call) => {
    call.on('error', noop)

    let {fromEventId, limit} = call.request

    fromEventId = max([0, fromEventId])

    let params = {fromEventId}
    if (limit > 0) params.limit = limit

    let dbResults = db.getEvents(params)
    let dbStream = eventsStreamFromDbEmitter(dbResults)
    dbStream.subscribe(
      event => call.write(event),
      err => call.emit('error', err),
      () => call.end()
    )
  }
}
