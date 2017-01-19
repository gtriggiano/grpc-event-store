import shortid from 'shortid'
import { every, max } from 'lodash'

import { isValidString, prefixString, isWritableStream } from '../../utils'

function WriteToAggregateStream ({backend, store, writableStreamsRegexList}) {
  return (call, callback) => {
    let writeRequests
    try {
      writeRequests = [validateAndGetBackendWriteRequest({
        request: call.request,
        writableStreamsRegexList
      })]
    } catch (e) {
      return callback(e)
    }

    let transactionId = shortid()

    let backendResults = backend.storeEvents({writeRequests, transactionId})

    backendResults.on('error', err => {
      backendResults.removeAllListeners()
      callback(err)
    })
    backendResults.on('storedEvents', storedEvents => {
      backendResults.removeAllListeners()
      store.publishEvents(storedEvents)
      callback(null, {events: storedEvents})
    })
  }
}

function validateAndGetBackendWriteRequest ({request, requestIndex, writableStreamsRegexList}) {
  let eMgs = prefixString(requestIndex !== undefined ? `[writing request ${requestIndex}]` : '')

  let { stream, expectedVersionNumber, events } = request

  // Validate request
  if (!isValidString(stream)) throw new TypeError(eMgs('stream MUST be a nonempty string'))
  if (!isWritableStream(stream, writableStreamsRegexList)) throw new Error(eMgs('stream is not writable'))
  if (!events || !events.length) throw new Error(eMgs('events MUST be a nonempty list of events to store'))
  if (!every(events, ({type}) => isValidString(type))) throw new TypeError(eMgs('all events MUST have a valid type'))

  expectedVersionNumber = max([-2, expectedVersionNumber])

  let params = {
    stream,
    events: events.map(e => ({
      type: e.type,
      data: e.data || ''
    })),
    expectedVersionNumber
  }
  return params
}

export default WriteToAggregateStream
export {
  validateAndGetBackendWriteRequest
}
