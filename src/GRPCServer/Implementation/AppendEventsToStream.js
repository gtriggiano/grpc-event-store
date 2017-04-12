import shortid from 'shortid'
import {
  every,
  max
} from 'lodash'

import { isNotEmptyString, prefixedString, defineError } from '../../utils'

export const ANY_VERSION_NUMBER = -2
export const ANY_POSITIVE_VERSION_NUMBER = -1

export const StreamDoesNotExistError = defineError('StreamDoesNotExistError', 'STREAM_DOES_NOT_EXIST')
export const StreamVersionMismatchError = defineError('StreamVersionMismatchError', 'STREAM_VERSION_MISMATCH')

export default function AppendEventsToStream ({
  db,
  eventsStream,
  onEventsStored,
  isStreamWritable
}) {
  return (call, callback) => {
    let appendRequests
    try {
      appendRequests = [validateAndGetDbAppendRequest({
        request: call.request,
        isStreamWritable
      })]
    } catch (e) {
      return callback(e)
    }

    let transactionId = shortid()

    let dbResults = db.appendEvents({appendRequests, transactionId})

    function onError (err) {
      cleanListeners()
      callback(err)
    }
    function onStoredEvents (storedEvents) {
      cleanListeners()
      onEventsStored(storedEvents)
      callback(null, {events: storedEvents})
    }
    function cleanListeners () {
      dbResults.removeListener('error', onError)
      dbResults.removeListener('storedEvents', onStoredEvents)
    }

    dbResults.on('error', onError)
    dbResults.on('storedEvents', onStoredEvents)
  }
}

export function validateAndGetDbAppendRequest ({
  request,
  requestIndex,
  isStreamWritable
}) {
  let prefix = prefixedString(requestIndex !== undefined ? `[writing request ${requestIndex}]` : '')
  let { stream, expectedVersionNumber, events } = request

  // Validate request
  if (!isNotEmptyString(stream)) throw new TypeError(prefix('stream MUST be a nonempty string'))
  if (!isStreamWritable(stream)) throw new Error(prefix(`stream '${stream}' is not writable`))
  if (!events || !events.length) throw new Error(prefix('events MUST be a nonempty list of events to store'))
  if (!every(events, ({type}) => isNotEmptyString(type))) throw new TypeError(prefix('all events MUST have a valid type'))

  expectedVersionNumber = max([-2, expectedVersionNumber])

  let appendRequest = {
    stream,
    events: events.map(e => ({
      type: e.type,
      data: e.data || ''
    })),
    expectedVersionNumber
  }
  return appendRequest
}
