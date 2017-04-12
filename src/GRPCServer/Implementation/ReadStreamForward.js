import {
  noop,
  max
} from 'lodash'

import { isNotEmptyString, eventsStreamFromDbEmitter } from '../../utils'

export default function ReadStreamForward ({
  db
}) {
  return (call) => {
    call.on('error', noop)

    let { stream, fromVersionNumber, limit } = call.request

    // Validate request
    if (!isNotEmptyString(stream)) return call.emit('error', new TypeError('stream should be a non empty string'))

    fromVersionNumber = max([0, fromVersionNumber])

    let params = {stream, fromVersionNumber}
    if (limit > 0) params.limit = limit

    let dbResults = db.getEventsByStream(params)
    let dbStream = eventsStreamFromDbEmitter(dbResults)
    dbStream.subscribe(
      event => call.write(event),
      err => call.emit('error', err),
      () => call.end()
    )
  }
}
