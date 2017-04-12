import shortid from 'shortid'
import sinon from 'sinon'
import EventEmitter from 'eventemitter3'
import Rx from 'rxjs/Rx'
import {
  range,
  sample
} from 'lodash'

const libFolder = `../${process.env.LIB_FOLDER}`
const SimpleStoreBus = require(`${libFolder}/SimpleStoreBus`).default
const utils = require(`${libFolder}/utils`)

export function RPCCall () {
  let call = new EventEmitter()
  sinon.spy(call, 'on')
  sinon.spy(call, 'emit')
  sinon.spy(call, 'removeAllListeners')
  call.write = sinon.spy()
  call.end = sinon.spy()
  return call
}

export function RPCCallback () {
  return sinon.spy()
}

export function DbAdapter () {
  const ANY_VERSION_NUMBER = -2
  const ANY_POSITIVE_VERSION_NUMBER = -1

  let eventTypes = range(1, 6).map(n => `SomethingHappened${n}`)
  let streams = range(1, 5).map(n => {
    let category = n % 2 ? 'odd-stream' : 'even-stream'
    return {
      name: `${category}::${n}`,
      category: category,
      version: 0
    }
  })
  let events = range(1, 200).map(n => {
    let stream = sample(streams)
    stream.version++
    let eventType = sample(eventTypes)

    let event = {
      id: n,
      type: eventType,
      stream: stream.name,
      stored: new Date(Date.now() + (n * 2)).toISOString(),
      versionNumber: stream.version,
      data: `data${n}`,
      transactionId: shortid()
    }

    return event
  })

  function getStreamByname (stream) {
    return streams.find(({name}) => name === stream)
  }

  // Events from mock db are emitted every ~1 ms
  function toDbEmitter (eventsList) {
    let dbEmitter = new EventEmitter()
    Rx.Observable.zip(
      Rx.Observable.from(eventsList),
      Rx.Observable.interval(1),
      (a) => a
    ).subscribe(
      (event) => dbEmitter.emit('event', event),
      null,
      () => dbEmitter.emit('end')
    )
    return dbEmitter
  }

  let db = {
    getEvents: sinon.spy(({
      fromEventId,
      limit
    }) => {
      let list = events.filter(({id}) => id > fromEventId)
      return toDbEmitter(limit ? list.slice(0, limit) : list)
    }),
    getEventsByStream: sinon.spy(({
      stream,
      fromVersionNumber,
      limit
    }) => {
      let list = events.filter(event => event.stream === stream && event.versionNumber > fromVersionNumber)
      return toDbEmitter(limit ? list.slice(0, limit) : list)
    }),
    getEventsByStreamsCategory: sinon.spy(({
      streamsCategory,
      fromEventId,
      limit
    }) => {
      let list = events.filter(event => {
        let category = event.stream.split('::')[0]
        return category === streamsCategory && event.id > fromEventId
      })
      return toDbEmitter(limit ? list.slice(0, limit) : list)
    }),
    appendEvents: sinon.spy(({
      appendRequests,
      transactionId
    }) => {
      let dbEmitter = new EventEmitter()
      setTimeout(() => {
        try {
          let storedEvents = []
          appendRequests.forEach(({
            stream,
            events,
            expectedVersionNumber
          }) => {
            let foundStream = getStreamByname(stream)
            if (expectedVersionNumber === ANY_VERSION_NUMBER) return
            if (expectedVersionNumber === ANY_POSITIVE_VERSION_NUMBER && !foundStream) {
              throw new Error('STREAM_DOES_NOT_EXIST')
            }
            if (expectedVersionNumber !== (foundStream ? foundStream.version : 0)) {
              throw new Error('STREAM_VERSION_MISMATCH')
            }
          })

          appendRequests.forEach(({
            stream,
            events
          }) => {
            let foundStream = getStreamByname(stream)
            if (!foundStream) {
              foundStream = {name: stream, version: 0, category: stream.split('::')[0]}
              streams.push(foundStream)
            }
            events.forEach(({type, data}) => {
              foundStream.version++

              let event = {
                id: events.length,
                type,
                stream,
                stored: new Date().toISOString(),
                versionNumber: foundStream.version,
                data,
                transactionId
              }

              events.push(event)
              storedEvents.push(event)
            })
          })

          dbEmitter.emit('storedEvents', storedEvents)
        } catch (e) {
          dbEmitter.emit('error', e)
        }
      }, 1)
      return dbEmitter
    })
  }

  return Object.defineProperties(db, {
    streams: {value: streams, enumerable: false},
    events: {value: events, enumerable: false}
  })
}

export default function Mocks (writableStreamsPatterns = []) {
  let db = DbAdapter()
  let storeBus = SimpleStoreBus()
  let eventsStream = utils.eventsStreamFromStoreBus(storeBus)
  let onEventsStored = sinon.spy((events) => {
    let eventsString = JSON.stringify(events)
    storeBus.publish(eventsString)
  })
  let isStreamWritable = utils.stringMatchesSomeRegex(
    writableStreamsPatterns.map(pattern => new RegExp(pattern))
  )

  return {
    config: {
      db,
      eventsStream,
      onEventsStored,
      isStreamWritable
    },
    args: {
      call: RPCCall(),
      callback: RPCCallback()
    }
  }
}
