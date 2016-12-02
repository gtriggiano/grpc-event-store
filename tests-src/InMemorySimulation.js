import path from 'path'
import Immutable from 'immutable'
import sinon from 'sinon'
import { range, sample, random, isArray, pick } from 'lodash'
import EventEmitter from 'eventemitter3'

var codePath = path.resolve(__dirname, '..', process.env.CODE_PATH)
function pathTo (dest) {
  return path.resolve(codePath, dest)
}
var eventsStreamFromBus = require(pathTo('utils')).eventsStreamFromBus

const STREAMS_NUM = 200
const STREAMS_CATEGORIES = Immutable.fromJS(range(3, 15).map(n => `Stream${n}`))
const EVENT_TYPES = Immutable.fromJS(range(20, 40).map(n => `EventType${n}`))
const MIN_EVENTS_PER_STREAM = 1
const MAX_EVENTS_PER_STREAM = 20

function InMemorySimulation (data) {
  let {aggregates, events, snapshots} = data
  let store = FixtureStore()
  let backend = FixtureBackend({aggregates, events, snapshots, store})

  return {
    aggregates,
    events,
    snapshots,
    backend: Object.keys(backend)
              .reduce((spied, handler) => {
                spied[handler] = sinon.spy(backend[handler])
                return spied
              }, {}),
    store,
    call: FixtureGRPCCall(),
    callback: sinon.spy()
  }
}

function FixtureBackend ({streams, events, store}) {
  function dispatchEvents (results, events) {
    setTimeout(() => {
      events.reduce((p, evt) => {
        let e = evt.toJS()
        let evtt = {
          aggregateIdentity: {
            id: e.aggregateId,
            type: e.aggregateType
          },
          ...pick(e, ['type', 'sequenceNumber', 'data', 'metadata', 'id', 'storedOn'])
        }
        return p.then(() => new Promise((resolve) => {
          setTimeout(() => {
            // console.log('stored event', evtt.id)
            results.emit('event', evtt)
            resolve()
          }, 1)
        }))
      }, Promise.resolve()).then(() => results.emit('end'))
    }, 100)
  }

  return {
    getEvents ({fromEventId, limit}) {
      let results = new EventEmitter()
      let filteredEvents = events.filter(event => event.get('id') > fromEventId)
      filteredEvents = limit ? filteredEvents.slice(0, limit) : filteredEvents

      dispatchEvents(results, filteredEvents)

      return results
    },
    getEventsByStream ({stream, fromVersionNumber, limit}) {
      let results = new EventEmitter()
      let filteredEvents = events.filter(event =>
        event.get('versionNumber') > fromVersionNumber &&
        event.get('stream') === stream
      )
      filteredEvents = limit ? filteredEvents.slice(0, limit) : filteredEvents

      dispatchEvents(results, filteredEvents)

      return results
    },
    getEventsByStreamCategory ({streamsCategory, fromEventId, limit}) {
      let results = new EventEmitter()
      let filteredEvents = events.filter(event => {
        let eventCategory = event.get('stream').split('-')[0]
        return event.get('id') > fromEventId && eventCategory === streamsCategory
      })
      filteredEvents = limit ? filteredEvents.slice(0, limit) : filteredEvents

      dispatchEvents(results, filteredEvents)

      return results
    },
    storeEvents ({writeRequests, transactionId}) {
      // we use event.metadata string starting with `failure`
      // as a trick to make the results EE emit `error`
      let _failure
      writeRequests.forEach(request =>
        request.events.forEach(event => {
          if (~event.data.indexOf('failure')) _failure = new Error(event.data)
        }))

      let results = new EventEmitter()
      let storedEvents = writeRequests
        .map(({stream, events}, rIdx) =>
          events.map((event, eIdx) => ({...event, stream, id: `${rIdx}${eIdx}`}))
        )
        .reduce((storedEvents, events) => storedEvents.concat(events), [])

      process.nextTick(() => {
        if (_failure) return results.emit('error', _failure)
        results.emit('storedEvents', storedEvents)
      })

      return results
    }
  }
}

function FixtureStore () {
  let messageBus = new EventEmitter()
  return {
    eventsStream: eventsStreamFromBus(messageBus),
    publishEvents: sinon.spy((events) => {
      events = isArray(events) ? events : [events]
      events.reduce((p, evt) => {
        let e = evt
        return p.then(() => new Promise((resolve) => {
          setTimeout(() => {
            // console.log('live event', e.id)
            messageBus.emit('StoredEvents', JSON.stringify([e]))
            resolve()
          }, 2)
        }))
      }, Promise.resolve())
    })
  }
}

function FixtureGRPCCall () {
  let call = new EventEmitter()
  sinon.spy(call, 'on')
  sinon.spy(call, 'emit')
  sinon.spy(call, 'removeAllListeners')
  call.write = sinon.spy()
  call.end = sinon.spy()

  return call
}

function getSimulationData () {
  let streamCategories = STREAMS_CATEGORIES.toArray()
  let eventTypes = EVENT_TYPES.toArray()
  let now = Date.now()
  let firstTime = now - (180 * 1000) // 3 min
  let streams = Immutable.fromJS(range(STREAMS_NUM).map(n => {
    let streamCategory = sample(streamCategories)
    let streamId = `${streamCategory}-${n}`
    return {
      id: streamId,
      category: streamCategory,
      version: random(MIN_EVENTS_PER_STREAM, MAX_EVENTS_PER_STREAM) // First version of stream should be 1
    }
  }))
  let eventsByStream = Immutable.fromJS(streams.map(
    (stream) => {
      return Immutable.fromJS(range(stream.get('version')).map(n => ({
        type: sample(eventTypes),
        stream: stream.get('id'),
        versionNumber: n + 1, // First event of an aggregate should be 1
        data: ''
      })))
    }
  ))

  let events = Immutable.fromJS(
    range(eventsByStream.flatten(true).size)
      .map(() => {
        let streamIdx = random(eventsByStream.size - 1)
        let stream = eventsByStream.get(streamIdx)
        let event = stream.get(0)
        eventsByStream = eventsByStream.set(streamIdx, stream.shift())
        if (!eventsByStream.get(streamIdx).size) {
          eventsByStream = eventsByStream.delete(streamIdx)
        }
        return event
      })
  )

  let instants = events
                  .map(() => random(firstTime, now))
                  .sortBy(ms => ms)
                  .map(ms => new Date(ms))
                  .map(d => d.toISOString())

  events = events.map(
    (event, idx) => event.set('id', idx + 1).set('stored', instants.get(idx))
  )

  return {
    streams,
    events
  }
}

export default InMemorySimulation
export {
  getSimulationData,
  STREAMS_NUM,
  STREAMS_CATEGORIES,
  EVENT_TYPES,
  MIN_EVENTS_PER_STREAM,
  MAX_EVENTS_PER_STREAM
}
