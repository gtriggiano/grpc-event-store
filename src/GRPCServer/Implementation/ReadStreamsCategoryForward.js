import {
  noop,
  max
} from 'lodash'

import { isNotEmptyString, eventsStreamFromDbEmitter } from '../../utils'

export default function ReadStreamsCategoryForward ({
  db
}) {
  return (call) => {
    call.on('error', noop)

    let {streamsCategory, fromEventId, limit} = call.request

    // Validate request
    if (!isNotEmptyString(streamsCategory)) return call.emit('error', new TypeError('streamsCategory should be a non empty string'))

    fromEventId = max([0, fromEventId])

    let params = {streamsCategory, fromEventId}
    if (limit > 0) params.limit = limit

    let dbResults = db.getEventsByStreamsCategory(params)
    let dbStream = eventsStreamFromDbEmitter(dbResults)
    dbStream.subscribe(
      event => call.write(event),
      err => call.emit('error', err),
      () => call.end()
    )
  }
}
