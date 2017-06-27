import fs from 'fs'
import { List, fromJS } from 'immutable'
import EventEmitter from 'eventemitter3'
import {
  isArray,
  flatten
} from 'lodash'

import {
  prefixedString
} from '../../utils'

import {
  ANY_VERSION_NUMBER,
  ANY_POSITIVE_VERSION_NUMBER
} from '../../GRPCServer/Implementation/AppendEventsToStream'

function InMemoryAdapter (config = {}) {
  let dbAdapter = new EventEmitter()
  let _config = {...defaultConfig, ...config}
  let state = parseConfig(_config)

  let {
    events
  } = state

  function getStreamsVersionNumbers (streams) {
    let streamsVersionNumbers = events.reduce((streamsVersionNumbers, event) => ({
      ...streamsVersionNumbers,
      [event.get('stream')]: event.get('versionNumber')
    }), {})
    streams.forEach(stream => {
      streamsVersionNumbers[stream] = streamsVersionNumbers[stream] || 0
    })
    return streamsVersionNumbers
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
        err.streamVersionNumber = streamVersionNumber
        err.expectedVersionNumber = expectedVersionNumber
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

  return Object.defineProperties(dbAdapter, {
    internalEvents: {get: () => events.toJS()},
    appendEvents: {
      value: ({appendRequests, transactionId}) => {
        let dbResults = new EventEmitter()
        let streams = appendRequests.map(({stream}) => stream)
        let streamsVersionNumbers = getStreamsVersionNumbers(streams)

        let processedAppendRequests = appendRequests.map(appendRequest => processAppendRequest({
          appendRequest,
          streamVersionNumber: streamsVersionNumbers[appendRequest.stream]
        }))
        let errors = processedAppendRequests.filter(result => result instanceof Error)
        if (errors.length) {
          process.nextTick(() => {
            dbResults.emit('error', new Error(`CONSISTENCY|${JSON.stringify(errors.map(({stream, reason, streamVersionNumber, expectedVersionNumber}) => ({stream, reason, streamVersionNumber, expectedVersionNumber})))}`))
          })
        } else {
          let now = new Date()
          let eventsToAppend = flatten(processedAppendRequests).map((event, idx) => ({
            ...event,
            id: `${events.size + 1 + idx}`,
            storedOn: now.toISOString(),
            transactionId
          }))

          events = events.concat(fromJS(eventsToAppend))

          dbAdapter.emit('update')

          process.nextTick(() => dbResults.emit('storedEvents', eventsToAppend))
        }

        return dbResults
      },
      enumerable: true
    },
    getEvents: {
      value: ({fromEventId, limit}) => {
        let dbResults = new EventEmitter()

        let _events = events.filter(event => parseInt(event.get('id'), 10) > fromEventId)
        _events = limit ? _events.slice(0, limit) : _events

        setTimeout(() => {
          _events.forEach(event => dbResults.emit('event', event.toJS()))
          dbResults.emit('end')
        }, 1)

        return dbResults
      },
      enumerable: true
    },
    getEventsByStream: {
      value: ({stream, fromVersionNumber, limit}) => {
        let dbResults = new EventEmitter()

        let _events = events.filter(event => event.get('stream') === stream && event.get('versionNumber') > fromVersionNumber)
        _events = limit ? _events.slice(0, limit) : _events

        setTimeout(() => {
          _events.forEach(event => dbResults.emit('event', event.toJS()))
          dbResults.emit('end')
        }, 1)

        return dbResults
      },
      enumerable: true
    },
    getEventsByStreamsCategory: {
      value: ({streamsCategory, fromEventId, limit}) => {
        let dbResults = new EventEmitter()

        let _events = events.filter(event => {
          let eventId = parseInt(event.get('id'), 10)
          let eventStream = event.get('stream')

          return eventId > fromEventId &&
            (
              eventStream === streamsCategory ||
              eventStream.split('::')[0] === streamsCategory
            )
        })
        _events = limit ? _events.slice(0, limit) : _events

        setTimeout(() => {
          _events.forEach(event => dbResults.emit('event', event.toJS()))
          dbResults.emit('end')
        }, 1)

        return dbResults
      },
      enumerable: true
    }
  })
}

const defaultConfig = {
  JSONFile: null
}

const prefix = prefixedString('[grpc Event Store InMemoryAdapter] ')
const parseConfig = ({
  JSONFile
}) => {
  let state = {events: List()}

  if (JSONFile) {
    let file
    try {
      file = fs.statSync(JSONFile)

      if (!file.isFile()) throw new Error()
      try {
        let fileEvents = JSON.parse(fs.readFileSync(JSONFile, 'utf8'))

        if (!isArray(fileEvents)) throw new Error()
        state.events = fromJS(fileEvents)
      } catch (e) {}
    } catch (e) {
      throw new TypeError(prefix('config.JSONFile MUST be either falsy or a path of a json file containing a list of events'))
    }
  }

  return state
}

export default InMemoryAdapter
