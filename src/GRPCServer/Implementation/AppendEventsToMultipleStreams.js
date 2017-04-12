import shortid from 'shortid'
import {
  uniq
} from 'lodash'

import { validateAndGetDbAppendRequest } from './AppendEventsToStream'

export default function AppendEventsToMultipleStreams ({
  db,
  eventsStream,
  onEventsStored,
  isStreamWritable
}) {
  return (call, callback) => {
    let { appendRequests } = call.request

    if (!appendRequests.length) return callback(new Error('appendRequests should be a list of event storage requests'))

    try {
      appendRequests = appendRequests.map(
        (request, requestIndex) => validateAndGetDbAppendRequest({
          request,
          requestIndex,
          isStreamWritable
        })
      )
    } catch (e) {
      return callback(e)
    }

    // Check that there is just one request for every stream
    let involvedStreams = uniq(appendRequests.map(({stream}) => stream))
    if (involvedStreams.length < appendRequests.length) return callback(new Error('each writeRequest should concern a different stream'))

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
