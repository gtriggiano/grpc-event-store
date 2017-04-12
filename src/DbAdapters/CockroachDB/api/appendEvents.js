import EventEmitter from 'eventemitter3'
import {
  flatten
} from 'lodash'

import {
  ANY_VERSION_NUMBER,
  ANY_POSITIVE_VERSION_NUMBER
} from '../../../GRPCServer/Implementation/AppendEventsToStream'

import transactionWrapper from '../helpers/transactionWrapper'
import getStreamsVersionNumbers from '../operations/getStreamsVersionNumbers'
import appendEventsToStreams from '../operations/appendEventsToStreams'

export default function appendEventsHOF (getConnection, eventsTable) {
  return ({appendRequests, transactionId}) => {
    let dbResults = new EventEmitter()

    getConnection((err, {client, release} = {}) => {
      if (err) return dbResults.emit('error', new Error(`DB_CONNECTION|${err.message}`))

      transactionWrapper(
        client,
        (client, done) => {
          let streams = appendRequests.map(({stream}) => stream)

          getStreamsVersionNumbers({
            client,
            eventsTable,
            streams
          })
          .then(streamsVersionNumbers => appendRequests.map(
            (appendRequest) => processAppendRequest({
              appendRequest,
              streamVersionNumber: streamsVersionNumbers[appendRequest.stream]
            })
          ))
          .then(processedAppendRequests => {
            let errors = processedAppendRequests.filter((result) => result instanceof Error)
            if (errors.length) {
              throw new Error(`CONSISTENCY|${JSON.stringify(errors.map(({stream, reason}) => ({stream, reason})))}`)
            }
            return appendEventsToStreams({
              client,
              eventsTable,
              transactionId,
              eventsToAppend: flatten(processedAppendRequests)
            })
          })
          .then(storedEvents => done(null, storedEvents))
          .catch(err => done(err))
        },
        (err, storedEvents) => {
          release()
          if (err) return dbResults.emit('error', err)
          dbResults.emit('storedEvents', storedEvents)
        }
      )
    })

    return dbResults
  }
}

function processAppendRequest ({
  appendRequest: {stream, events, expectedVersionNumber},
  streamVersionNumber
}) {
  if (expectedVersionNumber !== ANY_VERSION_NUMBER) {
    let err = new Error()
    err.stream = stream
    if (
      streamVersionNumber === 0 &&
      expectedVersionNumber === ANY_POSITIVE_VERSION_NUMBER
    ) {
      err.reason = 'STREAM_DOES_NOT_EXIST'
      return err
    }
    if (streamVersionNumber !== expectedVersionNumber) {
      err.reason = 'STREAM_VERSION_MISMATCH'
      return err
    }
  }

  return events.map(({type, data}, idx) => ({
    stream,
    type,
    data,
    versionNumber: streamVersionNumber + idx + 1
  }))
}
