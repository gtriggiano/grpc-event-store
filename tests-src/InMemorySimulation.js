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

const AGGREGATES_NUM = 200
const AGGREGATE_TYPES = Immutable.fromJS(range(3, 30).map(n => `Type${n}`))
const EVENT_TYPES = Immutable.fromJS(range(20, 40).map(n => `Type${n}`))
const MIN_EVENTS_PER_AGGREGATE = 1
const MAX_EVENTS_PER_AGGREGATE = 20
const SNAPSHOT_THRESHOLD = 7

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

function FixtureBackend ({aggregates, events, snapshots, store}) {
  function dispatchEvents (results, events) {
    events.forEach((evt, idx) => process.nextTick(() => {
      let e = evt.toJS()
      let evtt = {
        aggregateIdentity: {
          id: e.aggregateId,
          type: e.aggregateType
        },
        ...pick(e, ['type', 'sequenceNumber', 'data', 'metadata', 'id', 'storedOn'])
      }
      results.emit('event', evtt)
    }))
    setTimeout(function () {
      results.emit('end')
    }, events.size)
  }
  function dispatchSnapshot (results, snapshot) {
    if (snapshot) {
      process.nextTick(() => {
        let s = snapshot.toJS()
        let st = {
          aggregateIdentity: {
            id: s.aggregateId,
            type: s.aggregateType
          },
          ...pick(s, ['version', 'data'])
        }
        results.emit('snapshot', st)
      })
    }
    process.nextTick(() => results.emit('end'))
  }

  return {
    getEvents ({fromEventId, limit}) {
      let results = new EventEmitter()
      let filteredEvents = events.filter(evt => evt.get('id') > fromEventId)
      filteredEvents = limit ? filteredEvents.slice(0, limit) : filteredEvents

      dispatchEvents(results, filteredEvents)

      return results
    },
    getEventsByAggregate ({aggregateIdentity, fromVersion, limit}) {
      let results = new EventEmitter()
      let { id, type } = aggregateIdentity
      let filteredEvents = events.filter(evt =>
        evt.get('sequenceNumber') > fromVersion &&
        evt.get('aggregateId') === id &&
        evt.get('aggregateType') === type
      )
      filteredEvents = limit ? filteredEvents.slice(0, limit) : filteredEvents

      dispatchEvents(results, filteredEvents)

      return results
    },
    getEventsByAggregateTypes ({aggregateTypes, fromEventId, limit}) {
      let results = new EventEmitter()
      let filteredEvents = events.filter(evt =>
        evt.get('id') > fromEventId &&
        ~aggregateTypes.indexOf(evt.get('aggregateType'))
      )
      filteredEvents = limit ? filteredEvents.slice(0, limit) : filteredEvents

      dispatchEvents(results, filteredEvents)

      return results
    },
    getEventsByTypes ({eventTypes, fromEventId, limit}) {
      let results = new EventEmitter()
      let filteredEvents = events.filter(evt =>
        evt.get('id') > fromEventId &&
        ~eventTypes.indexOf(evt.get('type'))
      )
      filteredEvents = limit ? filteredEvents.slice(0, limit) : filteredEvents

      dispatchEvents(results, filteredEvents)

      return results
    },
    getLastSnapshotOfAggregate ({aggregateIdentity}) {
      let results = new EventEmitter()
      let { id, type } = aggregateIdentity
      let snapshot = snapshots.filter(snapshot =>
        snapshot.get('aggregateId') === id &&
        snapshot.get('aggregateType') === type
      ).takeLast(1).get(0)

      dispatchSnapshot(results, snapshot)

      return results
    },
    storeEvents ({writeRequests, transactionId}) {
      // we use event.metadata string starting with `failure`
      // as a trick to make the results EE emit `error`
      let _failure
      writeRequests.forEach(request =>
        request.events.forEach(e => {
          if (e.metadata.indexOf('failure') === 0) _failure = new Error(e.metadata)
        }))

      let results = new EventEmitter()
      let storedEvents = writeRequests
        .map(({aggregateIdentity, events}, rIdx) =>
          events.map((e, eIdx) => ({...e, aggregateIdentity, id: `${rIdx}${eIdx}`}))
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
      events.forEach((evt, idx) => setTimeout(() => {
        messageBus.emit('StoredEvents', JSON.stringify([evt]))
      }, idx * 5))
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
  let aggregateTypes = AGGREGATE_TYPES.toArray()
  let eventTypes = EVENT_TYPES.toArray()
  let now = Date.now()
  let firstTime = now - (180 * 1000) // 3 min
  let aggregates = Immutable.fromJS(range(AGGREGATES_NUM).map(n => ({
    id: `aid${n}`,
    type: sample(aggregateTypes),
    version: random(MIN_EVENTS_PER_AGGREGATE, MAX_EVENTS_PER_AGGREGATE) // First version of aggregate should be 1
  })))
  let aggregateStreams = Immutable.fromJS(aggregates.map(
    (aggregate) => {
      return Immutable.fromJS(range(aggregate.get('version')).map(n => ({
        type: sample(eventTypes),
        aggregateId: aggregate.get('id'),
        aggregateType: aggregate.get('type'),
        sequenceNumber: n + 1, // First event of an aggregate should be 1
        data: '',
        metadata: ''
      })))
    }
  ))

  let events = Immutable.fromJS(
    range(aggregateStreams.flatten(true).size)
      .map(() => {
        let streamIdx = random(aggregateStreams.size - 1)
        let stream = aggregateStreams.get(streamIdx)
        let evt = stream.get(0)
        aggregateStreams = aggregateStreams.set(streamIdx, stream.shift())
        if (!aggregateStreams.get(streamIdx).size) {
          aggregateStreams = aggregateStreams.delete(streamIdx)
        }
        return evt
      })
  )

  let instants = events
                  .map(() => random(firstTime, now))
                  .sortBy(ms => ms)
                  .map(ms => new Date(ms))
                  .map(d => d.toISOString())

  events = events.map(
    (evt, idx) => evt.set('id', idx + 1).set('storedOn', instants.get(idx))
  )

  let snapshots = aggregates
                    .filter(aggregate => aggregate.get('version') > SNAPSHOT_THRESHOLD)
                    .map(aggregate => {
                      let snapshotsN = Math.floor(aggregate.get('version') / SNAPSHOT_THRESHOLD)
                      return Immutable.fromJS(range(snapshotsN).map(n => ({
                        aggregateId: aggregate.get('id'),
                        aggregateType: aggregate.get('type'),
                        version: (n + 1) * SNAPSHOT_THRESHOLD,
                        data: ''
                      })))
                    }).flatten(true)

  return {
    aggregates,
    events,
    snapshots
  }
}

export default InMemorySimulation
export {
  getSimulationData,
  AGGREGATES_NUM,
  AGGREGATE_TYPES,
  EVENT_TYPES,
  MIN_EVENTS_PER_AGGREGATE,
  MAX_EVENTS_PER_AGGREGATE,
  SNAPSHOT_THRESHOLD
}
