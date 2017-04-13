import fs from 'fs'
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
} from '../../../GRPCServer/Implementation/AppendEventsToStream'

function InMemoryAdapter (config = {}) {
  let _config = {...defaultConfig, ...config}
  let state = parseConfig(_config)

  let {
    events,
    JSONFile
  } = state

  function getStreamsVersionNumbers (streams) {
    let streamsVersionNumbers = events.reduce((streamsVersionNumbers, event) => ({
      ...streamsVersionNumbers,
      [event.stream]: event.versionNumber
    }), {})
    streams.forEach(stream => {
      streamsVersionNumbers[stream] = streamsVersionNumbers[stream] || 0
    })
    return streamsVersionNumbers
  }

  function processAppendRequest ({
    appendRequests: {stream, events, expectedVersionNumber},
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

  return Object.defineProperties({}, {
    appendEvents: {
      value: ({appendRequests, transactionId}) => {
        let dbResults = new EventEmitter()
        let streams = appendRequests.map(({stream}) => stream)
        let streamsVersionNumbers = getStreamsVersionNumbers(streams)

        let processedAppendRequests = appendRequests.map(appendRequest => processAppendRequest({
          appendRequests,
          streamVersionNumber: streamsVersionNumbers[appendRequest.stream]
        }))
        let errors = processedAppendRequests.filter(result => result instanceof Error)
        if (errors.length) return Promise.reject(new Error(`CONSISTENCY|${JSON.stringify(errors.map(({stream, reason}) => ({stream, reason})))}`))

        let now = new Date()
        let eventsToAppend = flatten(processedAppendRequests).map((event, idx) => ({
          ...event,
          id: `${events.length + idx}`,
          storedOn: now.toISOString(),
          transactionId
        }))

        events.push(...eventsToAppend)

        if (JSONFile) {
          try {
            fs.writeFileSync(JSONFile, JSON.stringify(events))
          } catch (e) {}
        }

        process.nextTick(() => dbResults.emit('storedEvents', eventsToAppend))

        return dbResults
      },
      enumerable: true
    },
    getEvents: {
      value: ({fromEventId, limit}) => {
        let dbResults = new EventEmitter()

        let _events = events.filter(({id}) => id > fromEventId)
        _events = limit ? _events.slice(0, limit) : _events

        setTimeout(() => {
          _events.forEach(event => dbResults.emit('event', event))
          dbResults.emit('end')
        }, 1)

        return dbResults
      },
      enumerable: true
    },
    getEventsByStream: {
      value: ({stream, fromVersionNumber, limit}) => {
        let dbResults = new EventEmitter()

        let _events = events.filter((event) => event.stream === stream && event.versionNumber > fromVersionNumber)
        _events = limit ? _events.slice(0, limit) : _events

        setTimeout(() => {
          _events.forEach(event => dbResults.emit('event', event))
          dbResults.emit('end')
        }, 1)

        return dbResults
      },
      enumerable: true
    },
    getEventsByStreamsCategory: {
      value: ({streamsCategory, fromEventId, limit}) => {
        let dbResults = new EventEmitter()

        let _events = events.filter(({id, stream}) => id > fromEventId && (stream === streamsCategory || stream.split('::')[0] === streamsCategory))
        _events = limit ? _events.slice(0, limit) : _events

        setTimeout(() => {
          _events.forEach(event => dbResults.emit('event', event))
          dbResults.emit('end')
        }, 1)

        return dbResults
      },
      enumerable: true
    }
  })
}

const defaultConfig = {
  events: [],
  JSONFile: null,
  onStateUpdate: null
}

const prefix = prefixedString('[grpc Event Store InMemoryAdapter] ')
const parseConfig = ({
  JSONFile
}) => {
  let state = {events: []}

  if (JSONFile) {
    let file
    try {
      file = fs.fstatSync(JSONFile)
      if (!file.isFile()) throw new Error(`config.JSONFile MUST be either falsy or a path of a json file of events`)
      try {
        let fileEvents = JSON.parse(fs.readFileSync(JSONFile, 'utf8'))
        if (!isArray(fileEvents)) throw new Error()
        state.JSONFile = JSONFile
      } catch (e) {
        state.events = []
      }
    } catch (e) {
      throw new TypeError(prefix(e.message))
    }
  }

  return state
}

export default InMemoryAdapter
