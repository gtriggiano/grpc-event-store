import path from 'path'
import pg from 'pg'
import { random, pick, uniq, min, isString } from 'lodash'
import shortid from 'shortid'
import should from 'should/as-function'
import sinon from 'sinon'
import Immutable from 'immutable'
import EventEmitter from 'eventemitter3'

// Load test data in memory
let data = require('./testData.json')
global.testData = {
  aggregates: Immutable.fromJS(data.aggregates),
  events: Immutable.fromJS(data.events),
  snapshots: Immutable.fromJS(data.snapshots)
}

var codePath = path.resolve(__dirname, '..', process.env.CODE_PATH)
function pathTo (dest) {
  return path.resolve(codePath, dest)
}

var eventRecordToDTO = require(pathTo('BackendInterface/backends/cockroachdb/helpers/eventRecordToDTO')).default
var CockroachBackend = require(pathTo('BackendInterface/backends/cockroachdb')).default

let cockroachCoordinates = {
  host: process.env.COCKROACH_HOST || 'cockroach',
  port: process.env.COCKROACH_PORT ? parseInt(process.env.COCKROACH_PORT, 10) : 26257,
  user: process.env.COCKROACH_USER || 'root'
}
let backend = CockroachBackend(cockroachCoordinates)

describe('CockroachBackend([settings])', () => {
  it(`is a function`, () => should(CockroachBackend).be.a.Function())
  it('passing `settings` is optional', () => {
    function notThrowing () {
      CockroachBackend()
    }
    should(notThrowing).not.throw()
  })
  it('throws if settings.host is neither a valid hostname or an IPv4 address', () => {
    should(() => CockroachBackend({host: ''})).throw()
    should(() => CockroachBackend({host: '@host'})).throw()
    should(() => CockroachBackend({host: '@host..com'})).throw()
    should(() => CockroachBackend({host: {}})).throw()

    should(() => CockroachBackend({host: 'hostname'})).not.throw()
    should(() => CockroachBackend({host: 'hostname.com'})).not.throw()
    should(() => CockroachBackend({host: '127.0.0.1'})).not.throw()
  })
  it('throws if settings.port is not a positive integer', () => {
    function throwing () {
      CockroachBackend({
        port: ''
      })
    }
    function throwing2 () {
      CockroachBackend({
        port: -2
      })
    }
    should(throwing).throw()
    should(throwing2).throw()
  })
  it('throws if settings.database is not a valid string', () => {
    function throwing () {
      CockroachBackend({
        database: ''
      })
    }
    function throwing2 () {
      CockroachBackend({
        database: 2
      })
    }
    should(throwing).throw()
    should(throwing2).throw()
  })
  it('throws if settings.user is not a valid string', () => {
    function throwing () {
      CockroachBackend({
        user: ''
      })
    }
    function throwing2 () {
      CockroachBackend({
        user: 2
      })
    }
    should(throwing).throw()
    should(throwing2).throw()
  })
  it('throws if settings.max is not a positive integer', () => {
    function throwing () {
      CockroachBackend({
        max: ''
      })
    }
    function throwing2 () {
      CockroachBackend({
        max: -2
      })
    }
    should(throwing).throw()
    should(throwing2).throw()
  })
  it('throws if settings.idleTimeoutMillis is not a positive integer', () => {
    function throwing () {
      CockroachBackend({
        idleTimeoutMillis: ''
      })
    }
    function throwing2 () {
      CockroachBackend({
        idleTimeoutMillis: -2
      })
    }
    should(throwing).throw()
    should(throwing2).throw()
  })
  describe('Default settings', () => {
    it('host === `localhost`', () => {
      should(CockroachBackend().settings.host).equal('localhost')
    })
    it('port === 26257', () => {
      should(CockroachBackend().settings.port).equal(26257)
    })
    it('database === `eventstore`', () => {
      should(CockroachBackend().settings.database).equal('eventstore')
    })
    it('user === `root`', () => {
      should(CockroachBackend().settings.user).equal('root')
    })
    it('max === 10', () => {
      should(CockroachBackend().settings.max).equal(10)
    })
    it('idleTimeoutMillis === 30000', () => {
      should(CockroachBackend().settings.idleTimeoutMillis).equal(30000)
    })
  })
})

describe('Cockroach Backend instance', () => {
  it('has method .setup()', () => {
    should(backend.setup).be.a.Function()
  })
  it('has method .getEvents()', () => {
    should(backend.getEvents).be.a.Function()
  })
  it('has method .getEventsByAggregate()', () => {
    should(backend.getEventsByAggregate).be.a.Function()
  })
  it('has method .getEventsByAggregateTypes()', () => {
    should(backend.getEventsByAggregateTypes).be.a.Function()
  })
  it('has method .getEventsByTypes()', () => {
    should(backend.getEventsByTypes).be.a.Function()
  })
  it('has method .getLastSnapshotOfAggregate()', () => {
    should(backend.getLastSnapshotOfAggregate).be.a.Function()
  })
  it('has method .storeEvents()', () => {
    should(backend.storeEvents).be.a.Function()
  })
})

describe('backend.setup(callback(err))', () => {
  before(() => flushDB())

  it('ensures the aggregates, events and snapshots tables and call callback', (done) => {
    backend.setup((err) => {
      if (err) return done(err)
      getClient().then(client => {
        client.query(
          `SHOW TABLES FROM eventstore`,
          (err, result) => {
            if (err) done(err)
            should(result.rows.map(({Table}) => Table)).containDeep([
              'aggregates',
              'events',
              'snapshots'
            ])
            client.end()
            done()
          }
        )
      })
    })
  })
})
describe('backend.getEvents({fromEventId[, limit]})', () => {
  before(() => populateDB())

  it('returns an Event Emitter', () => {
    let results = backend.getEvents({fromEventId: 0, limit: 1})
    should(results).be.an.instanceof(EventEmitter)
  })
  it('returned EE emits `event` for each event fetched', (done) => {
    let storedEvents = testData.events.slice(-10)
    let results = backend.getEvents({
      fromEventId: storedEvents.get(0).get('id') - 1
    })
    let spy = sinon.spy()
    results.on('event', spy)
    results.on('end', () => {
      let spyCalls = spy.getCalls()
      should(spyCalls.length).equal(10)
      done()
    })
  })
  it('returned EE emits `end` event when all fetched events have been emitted', (done) => {
    let storedEvents = testData.events.slice(-10)
    let results = backend.getEvents({
      fromEventId: storedEvents.get(0).get('id') - 1
    })
    let c = 0
    results.on('event', () => {
      c++
    })
    results.on('end', () => {
      should(c).equal(10)
      done()
    })
  })
  it('returned EE emits just `end` if no events are found', (done) => {
    let results = backend.getEvents({
      fromEventId: 1000000
    })
    let spy = sinon.spy()
    results.on('event', spy)
    results.on('end', () => {
      let spyCalls = spy.getCalls()
      should(spyCalls.length).equal(0)
      done()
    })
  })
  it('returned EE emits the events ordered by `id`', function (done) {
    this.timeout(4000)
    let results = backend.getEvents({
      fromEventId: '0'
    })
    let spy = sinon.spy()
    results.on('event', spy)
    results.on('end', () => {
      let spyCalls = spy.getCalls()
      let eventIds = spyCalls.map(({args}) => args[0].id)
      let testEventsIds = testData.events.toJS().map(({id}) => id)
      should(eventIds.length).equal(testData.events.size)
      should(eventIds).containDeepOrdered(testEventsIds)
      done()
    })
  })
  it('fetching gets all events with `id` > `fromEventId`', function (done) {
    this.timeout(4000)
    let storedEvents = testData.events.slice(random(-5, -testData.events.size))
    let results = backend.getEvents({
      fromEventId: storedEvents.get(0).get('id') - 1
    })
    let spy = sinon.spy()
    results.on('event', spy)
    results.on('end', () => {
      let spyCalls = spy.getCalls()
      should(spyCalls.length).equal(storedEvents.size)
      should(spyCalls.map(({args}) => args[0].id)).containDeepOrdered(storedEvents.toJS().map(({id}) => id))
      done()
    })
  })
  it('fetching takes in to account `limit` param if provided', (done) => {
    let lastEvtsN = random(-100, -50)
    let storedEvents = testData.events.slice(lastEvtsN)
    let limit = random(1, storedEvents.size * 2)
    let results = backend.getEvents({
      fromEventId: storedEvents.get(0).get('id') - 1,
      limit
    })
    let spy = sinon.spy()
    results.on('event', spy)
    results.on('end', () => {
      let spyCalls = spy.getCalls()
      should(spyCalls.length).equal(min([limit, storedEvents.size]))
      should(spyCalls.map(({args}) => args[0].id)).containDeepOrdered(storedEvents.slice(0, limit).toJS().map(({id}) => id))
      done()
    })
  })
})
describe('backend.getEventsByAggregate({aggregateIdentity, fromVersion[, limit]})', () => {
  let aggregatesWithManyVersions = testData.aggregates.filter(a => a.get('version') > 10)
  let testAggregate = aggregatesWithManyVersions.get(random(aggregatesWithManyVersions.size - 1))
  let testAggregateEvents = testData.events.filter(e =>
    e.get('aggregateId') === testAggregate.get('id') &&
    e.get('aggregateType') === testAggregate.get('type')
  )
  let testAggregateIdentity = pick(testAggregate.toJS(), ['id', 'type'])

  it('returns an Event Emitter', () => {
    let results = backend.getEventsByAggregate({
      aggregateIdentity: testAggregateIdentity,
      fromVersion: 0
    })
    should(results).be.an.instanceof(EventEmitter)
  })
  it('returned EE emits `event` for each event fetched', (done) => {
    let results = backend.getEventsByAggregate({
      aggregateIdentity: testAggregateIdentity,
      fromVersion: 0
    })
    let spy = sinon.spy()
    results.on('event', spy)
    results.on('end', () => {
      let spyCalls = spy.getCalls()
      should(spyCalls.length).equal(testAggregateEvents.size)
      done()
    })
  })
  it('returned EE emits `end` event when all fetched events have been emitted', (done) => {
    let results = backend.getEventsByAggregate({
      aggregateIdentity: testAggregateIdentity,
      fromVersion: 0
    })
    let c = 0
    results.on('event', () => {
      c++
    })
    results.on('end', () => {
      should(c).equal(testAggregateEvents.size)
      done()
    })
  })
  it('returned EE emits just `end` if no events are found', (done) => {
    let results = backend.getEventsByAggregate({
      aggregateIdentity: testAggregateIdentity,
      fromVersion: 1000
    })
    let spy = sinon.spy()
    results.on('event', spy)
    results.on('end', () => {
      let spyCalls = spy.getCalls()
      should(spyCalls.length).equal(0)
      done()
    })
  })
  it('returned EE emits the events ordered by `id`', (done) => {
    let results = backend.getEventsByAggregate({
      aggregateIdentity: testAggregateIdentity,
      fromVersion: 0
    })
    let spy = sinon.spy()
    results.on('event', spy)
    results.on('end', () => {
      let spyCalls = spy.getCalls()
      should(spyCalls.map(({args}) => args[0].id)).containDeepOrdered(testAggregateEvents.toJS().map(({id}) => id))
      done()
    })
  })
  it('fetching gets all events with `sequenceNumber` > `fromVersion`', (done) => {
    let storedEvents = testAggregateEvents.filter(e => e.get('sequenceNumber') > 2)
    let results = backend.getEventsByAggregate({
      aggregateIdentity: testAggregateIdentity,
      fromVersion: 2
    })
    let spy = sinon.spy()
    results.on('event', spy)
    results.on('end', () => {
      let spyCalls = spy.getCalls()
      should(spyCalls.length).equal(storedEvents.size)
      should(spyCalls.map(({args}) => args[0].id)).containDeepOrdered(storedEvents.toJS().map(({id}) => id))
      done()
    })
  })
  it('fetching takes in to account `limit` param if provided', (done) => {
    let storedEvents = testAggregateEvents.filter(e => e.get('sequenceNumber') > 2)
    let limit = random(1, storedEvents.size * 2)
    let results = backend.getEventsByAggregate({
      aggregateIdentity: testAggregateIdentity,
      fromVersion: 2,
      limit
    })
    let spy = sinon.spy()
    results.on('event', spy)
    results.on('end', () => {
      let spyCalls = spy.getCalls()
      should(spyCalls.length).equal(min([limit, storedEvents.size]))
      should(spyCalls.map(({args}) => args[0].id)).containDeepOrdered(storedEvents.slice(0, limit).toJS().map(({id}) => id))
      done()
    })
  })
})
describe('backend.getEventsByAggregateTypes({aggregateTypes, fromEventId[, limit]})', () => {
  let testAggregates = testData.aggregates
    .sortBy(() => Math.random())
    .slice(0, 3)
  let testAggregatesTypes = uniq(testAggregates.map(a => a.get('type')).toJS())
  let testEvents = testData.events.filter(e => !!~testAggregatesTypes.indexOf(e.get('aggregateType')))

  it('returns an Event Emitter', () => {
    let results = backend.getEventsByAggregateTypes({
      aggregateTypes: testAggregatesTypes,
      fromEventId: 0,
      limit: 1
    })
    should(results).be.an.instanceof(EventEmitter)
  })
  it('returned EE emits `event` for each event fetched', (done) => {
    let results = backend.getEventsByAggregateTypes({
      aggregateTypes: testAggregatesTypes,
      fromEventId: 0
    })
    let spy = sinon.spy()
    results.on('event', spy)
    results.on('end', () => {
      let spyCalls = spy.getCalls()
      should(spyCalls.length).equal(testEvents.size)
      done()
    })
  })
  it('returned EE emits `end` event when all fetched events have been emitted', (done) => {
    let results = backend.getEventsByAggregateTypes({
      aggregateTypes: testAggregatesTypes,
      fromEventId: 0
    })
    let c = 0
    results.on('event', () => {
      c++
    })
    results.on('end', () => {
      should(c).equal(testEvents.size)
      done()
    })
  })
  it('returned EE emits just `end` if no events are found', (done) => {
    let results = backend.getEventsByAggregateTypes({
      aggregateTypes: testAggregatesTypes,
      fromEventId: 1000000
    })
    let spy = sinon.spy()
    results.on('event', spy)
    results.on('end', () => {
      let spyCalls = spy.getCalls()
      should(spyCalls.length).equal(0)
      done()
    })
  })
  it('returned EE emits the events ordered by `id`', (done) => {
    let results = backend.getEventsByAggregateTypes({
      aggregateTypes: testAggregatesTypes,
      fromEventId: 0
    })
    let spy = sinon.spy()
    results.on('event', spy)
    results.on('end', () => {
      let spyCalls = spy.getCalls()
      should(spyCalls.map(({args}) => args[0].id)).containDeepOrdered(testEvents.toJS().map(({id}) => id))
      done()
    })
  })
  it('fetching gets all events with `id` > `fromEventId`', (done) => {
    let storedEvents = testEvents.slice(random(-5, -testEvents.size))
    let results = backend.getEventsByAggregateTypes({
      aggregateTypes: testAggregatesTypes,
      fromEventId: storedEvents.get(0).get('id') - 1
    })
    let spy = sinon.spy()
    results.on('event', spy)
    results.on('end', () => {
      let spyCalls = spy.getCalls()
      should(spyCalls.length).equal(storedEvents.size)
      should(spyCalls.map(({args}) => args[0].id)).containDeepOrdered(storedEvents.toJS().map(({id}) => id))
      done()
    })
  })
  it('fetching takes in to account `limit` param if provided', (done) => {
    let storedEvents = testEvents.slice(random(-5, -testEvents.size))
    let limit = random(1, storedEvents.size * 2)
    let results = backend.getEventsByAggregateTypes({
      aggregateTypes: testAggregatesTypes,
      fromEventId: storedEvents.get(0).get('id') - 1,
      limit
    })
    let spy = sinon.spy()
    results.on('event', spy)
    results.on('end', () => {
      let spyCalls = spy.getCalls()
      should(spyCalls.length).equal(min([limit, storedEvents.size]))
      should(spyCalls.map(({args}) => args[0].id)).containDeepOrdered(storedEvents.slice(0, limit).toJS().map(({id}) => id))
      done()
    })
  })
})
describe('backend.getEventsByTypes({eventTypes, fromEventId, limit})', () => {
  let testEventTypes = uniq(testData.events.slice(0, 4).map(e => e.get('type')).toJS())
  let testEvents = testData.events.filter(e => !!~testEventTypes.indexOf(e.get('type')))

  it('returns an Event Emitter', () => {
    let results = backend.getEventsByTypes({
      eventTypes: testEventTypes,
      fromEventId: 0,
      limit: 1
    })
    should(results).be.an.instanceof(EventEmitter)
  })
  it('returned EE emits `event` for each event fetched', (done) => {
    let results = backend.getEventsByTypes({
      eventTypes: testEventTypes,
      fromEventId: 0
    })
    let spy = sinon.spy()
    results.on('event', spy)
    results.on('end', () => {
      let spyCalls = spy.getCalls()
      should(spyCalls.length).equal(testEvents.size)
      done()
    })
  })
  it('returned EE emits `end` event when all fetched events have been emitted', (done) => {
    let results = backend.getEventsByTypes({
      eventTypes: testEventTypes,
      fromEventId: 0
    })
    let c = 0
    results.on('event', () => {
      c++
    })
    results.on('end', () => {
      should(c).equal(testEvents.size)
      done()
    })
  })
  it('returned EE emits just `end` if no events are found', (done) => {
    let results = backend.getEventsByTypes({
      eventTypes: testEventTypes,
      fromEventId: 1000000
    })
    let spy = sinon.spy()
    results.on('event', spy)
    results.on('end', () => {
      let spyCalls = spy.getCalls()
      should(spyCalls.length).equal(0)
      done()
    })
  })
  it('returned EE emits the events ordered by `id`', (done) => {
    let results = backend.getEventsByTypes({
      eventTypes: testEventTypes,
      fromEventId: 0
    })
    let spy = sinon.spy()
    results.on('event', spy)
    results.on('end', () => {
      let spyCalls = spy.getCalls()
      should(spyCalls.map(({args}) => args[0].id)).containDeepOrdered(testEvents.toJS().map(({id}) => id))
      done()
    })
  })
  it('fetching gets all events with `id` > `fromEventId`', (done) => {
    let storedEvents = testEvents.slice(random(-5, -testEvents.size))
    let results = backend.getEventsByTypes({
      eventTypes: testEventTypes,
      fromEventId: storedEvents.get(0).get('id') - 1
    })
    let spy = sinon.spy()
    results.on('event', spy)
    results.on('end', () => {
      let spyCalls = spy.getCalls()
      should(spyCalls.length).equal(storedEvents.size)
      should(spyCalls.map(({args}) => args[0].id)).containDeepOrdered(storedEvents.toJS().map(({id}) => id))
      done()
    })
  })
  it('fetching takes in to account `limit` param if provided', (done) => {
    let storedEvents = testEvents.slice(random(-5, -testEvents.size))
    let limit = random(1, storedEvents.size * 2)
    let results = backend.getEventsByTypes({
      eventTypes: testEventTypes,
      fromEventId: storedEvents.get(0).get('id') - 1,
      limit
    })
    let spy = sinon.spy()
    results.on('event', spy)
    results.on('end', () => {
      let spyCalls = spy.getCalls()
      should(spyCalls.length).equal(min([limit, storedEvents.size]))
      should(spyCalls.map(({args}) => args[0].id)).containDeepOrdered(storedEvents.slice(0, limit).toJS().map(({id}) => id))
      done()
    })
  })
})
describe('backend.getLastSnapshotOfAggregate({aggregateIdentity})', () => {
  let testAggregateIdentity = testData.snapshots
    .groupBy(s => s.get('aggregateId'))
    .filter(aggSnapshots => aggSnapshots.size > 1)
    .toList()
    .flatten(true)
    .sortBy(() => Math.random())
    .takeLast(1)
    .map(s => ({
      id: s.get('aggregateId'),
      type: s.get('aggregateType')
    }))
    .get(0)

  let storedAggregateSnapshot = testData.snapshots.filter(s =>
    s.get('aggregateId') === testAggregateIdentity.id &&
    s.get('aggregateType') === testAggregateIdentity.type
  ).sortBy(s => -s.get('version')).get(0)
  storedAggregateSnapshot = {
    aggregateIdentity: {
      id: storedAggregateSnapshot.get('aggregateId'),
      type: storedAggregateSnapshot.get('aggregateType')
    },
    version: storedAggregateSnapshot.get('version'),
    data: storedAggregateSnapshot.get('data')
  }

  it('returns an Event Emitter', () => {
    let results = backend.getLastSnapshotOfAggregate({aggregateIdentity: testAggregateIdentity})
    should(results).be.an.instanceof(EventEmitter)
  })
  it('returned EE emits `snapshot` if a snapshot is found, then `end`', (done) => {
    let results = backend.getLastSnapshotOfAggregate({aggregateIdentity: testAggregateIdentity})
    let spy = sinon.spy()
    results.on('snapshot', spy)
    results.on('end', () => {
      let spyCalls = spy.getCalls()
      should(spyCalls.length).equal(1)
      done()
    })
  })
  it('returned EE emits just `end` if a snapshot is not found', (done) => {
    let results = backend.getLastSnapshotOfAggregate({aggregateIdentity: {
      id: 'notexists',
      type: 'notexists'
    }})
    let spy = sinon.spy()
    results.on('snapshot', spy)
    results.on('end', () => {
      let spyCalls = spy.getCalls()
      should(spyCalls.length).equal(0)
      done()
    })
  })
  it('returned EE emits just the last snapshot of an aggregate', (done) => {
    let results = backend.getLastSnapshotOfAggregate({aggregateIdentity: testAggregateIdentity})
    let spy = sinon.spy()
    results.on('snapshot', spy)
    results.on('end', () => {
      let spyCalls = spy.getCalls()
      should(spyCalls.length).equal(1)
      should(spyCalls[0].args[0]).deepEqual(storedAggregateSnapshot)
      done()
    })
  })
})
describe('backend.storeEvents({writeRequests, transactionId})', () => {
  let aggregatesRandomized = testData.aggregates.sortBy(() => Math.random())
  let aggregate1 = aggregatesRandomized.get(0)
  let aggregate2 = aggregatesRandomized.get(1)
  let aggregate1Identity = pick(aggregate1.toJS(), ['id', 'type'])
  let aggregate2Identity = pick(aggregate2.toJS(), ['id', 'type'])

  beforeEach(function () {
    this.timeout(0)
    return flushDB()
      .then(() => setupDB())
      .then(() => populateDB())
  })

  it('returns an Event Emitter', () => {
    let ee = backend.storeEvents({
      writeRequests: [{
        aggregateIdentity: aggregate1Identity,
        events: [{type: 'test', data: '', metadata: ''}],
        expectedAggregateVersion: aggregate1.get('version')
      }],
      transactionId: shortid()
    })
    should(ee).be.an.instanceof(EventEmitter)
  })
  it('returned EE emits `storedEvents` with a list of created events', function (done) {
    let transactionId = shortid()
    let ee = backend.storeEvents({
      writeRequests: [
        {
          aggregateIdentity: aggregate1Identity,
          events: [
            {type: 'TypeOne', data: 'data of first event', metadata: 'metadata of first event'},
            {type: 'TypeTwo', data: 'data of second event', metadata: 'metadata of second event'}
          ],
          expectedAggregateVersion: aggregate1.get('version')
        }
      ],
      transactionId
    })
    ee.on('error', err => done(err))
    ee.on('storedEvents', (events) => {
      should(events.length).equal(2)

      should(isString(events[0].id)).be.True()
      should(events[0].type).equal('TypeOne')
      should(events[0].aggregateIdentity).deepEqual(aggregate1Identity)
      should(events[0].sequenceNumber).equal(aggregate1.get('version') + 1)
      should(events[0].data).equal('data of first event')
      should(events[0].metadata).equal('metadata of first event')
      should(events[0].transactionId).equal(transactionId)

      should(isString(events[1].id)).be.True()
      should(events[1].type).equal('TypeTwo')
      should(events[1].aggregateIdentity).deepEqual(aggregate1Identity)
      should(events[1].sequenceNumber).equal(aggregate1.get('version') + 2)
      should(events[1].data).equal('data of second event')
      should(events[1].metadata).equal('metadata of second event')
      should(events[1].transactionId).equal(transactionId)

      done()
    })
  })
  it('returned EE emits `error` if there is a version mismatch', (done) => {
    let transactionId = shortid()
    let ee = backend.storeEvents({
      writeRequests: [
        {
          aggregateIdentity: aggregate1Identity,
          events: [
            {type: 'TypeOne', data: 'data of first event', metadata: 'metadata of first event'},
            {type: 'TypeTwo', data: 'data of second event', metadata: 'metadata of second event'}
          ],
          expectedAggregateVersion: aggregate1.get('version') + 1
        }
      ],
      transactionId
    })
    ee.on('error', err => {
      should(err.message.match(/mismatch/).length).equal(1)
      done()
    })
    ee.on('storedEvents', () => done(new Error('should not emit `storedEvents`, but `error`')))
  })
  it('returned EE emits `error` if expectedAggregateVersion === 0 and the aggregate already exists', (done) => {
    let transactionId = shortid()
    let ee = backend.storeEvents({
      writeRequests: [
        {
          aggregateIdentity: aggregate1Identity,
          events: [
            {type: 'TypeOne', data: 'data of first event', metadata: 'metadata of first event'},
            {type: 'TypeTwo', data: 'data of second event', metadata: 'metadata of second event'}
          ],
          expectedAggregateVersion: 0
        }
      ],
      transactionId
    })
    ee.on('error', err => {
      should(err.message.match(/already\ exists/).length).equal(1)
      done()
    })
    ee.on('storedEvents', () => done(new Error('should not emit `storedEvents`, but `error`')))
  })
  it('returned EE emits `error` if expectedAggregateVersion > 0 ad the aggregate does not exists', (done) => {
    let transactionId = shortid()
    let ee = backend.storeEvents({
      writeRequests: [
        {
          aggregateIdentity: {type: 'Not', id: 'Exists'},
          events: [
            {type: 'TypeOne', data: 'data of first event', metadata: 'metadata of first event'},
            {type: 'TypeTwo', data: 'data of second event', metadata: 'metadata of second event'}
          ],
          expectedAggregateVersion: 1
        }
      ],
      transactionId
    })
    ee.on('error', err => {
      should(err.message.match(/does\ not\ exists/).length).equal(1)
      done()
    })
    ee.on('storedEvents', () => done(new Error('should not emit `storedEvents`, but `error`')))
  })
  it('updates the aggregate\'s version in the `aggregates` table', (done) => {
    let transactionId = shortid()
    let ee = backend.storeEvents({
      writeRequests: [
        {
          aggregateIdentity: aggregate1Identity,
          events: [
            {type: 'TypeOne', data: 'data of first event', metadata: 'metadata of first event'},
            {type: 'TypeTwo', data: 'data of second event', metadata: 'metadata of second event'}
          ],
          expectedAggregateVersion: aggregate1.get('version')
        }
      ],
      transactionId
    })
    ee.on('error', err => done(err))
    ee.on('storedEvents', (events) => {
      getClient()
      .then(client => {
        client.query(`
          SELECT * FROM eventstore.aggregates
          WHERE id = $1
            AND type = $2`,
          [aggregate1Identity.id, aggregate1Identity.type],
          (err, result) => {
            client.end()
            if (err) return done(err)
            should(parseInt(result.rows[0].version, 10)).equal(aggregate1.get('version') + 2)
            done()
          }
        )
      })
    })
  })
  it('saves an aggregate snapshot if present in a writeRequest', (done) => {
    let transactionId = shortid()
    let snapshot = 'aggregate1Identity snapshot'
    let ee = backend.storeEvents({
      writeRequests: [
        {
          aggregateIdentity: aggregate1Identity,
          events: [
            {type: 'TypeOne', data: 'data of first event', metadata: 'metadata of first event'},
            {type: 'TypeTwo', data: 'data of second event', metadata: 'metadata of second event'}
          ],
          expectedAggregateVersion: aggregate1.get('version'),
          snapshot
        }
      ],
      transactionId
    })
    ee.on('error', err => done(err))
    ee.on('storedEvents', (events) => {
      getClient()
      .then(client => {
        client.query(`
          SELECT * FROM eventstore.snapshots
          WHERE aggregateId = $1
            AND aggregateType = $2
          ORDER BY version DESC
          LIMIT 1`,
          [aggregate1Identity.id, aggregate1Identity.type],
          (err, result) => {
            client.end()
            if (err) return done(err)
            should(parseInt(result.rows[0].version, 10)).equal(aggregate1.get('version') + 2)
            should(result.rows[0].data.toString()).equal(snapshot)
            done()
          }
        )
      })
    })
  })
  it('creates new aggregates if writing to not existent aggregate\'streams with expectedAggregateVersion < 0', (done) => {
    let transactionId = shortid()
    let newAggregateIdentity = {type: 'Not', id: 'Exists'}
    let ee = backend.storeEvents({
      writeRequests: [
        {
          aggregateIdentity: newAggregateIdentity,
          events: [
            {type: 'TypeOne', data: 'data of first event', metadata: 'metadata of first event'},
            {type: 'TypeTwo', data: 'data of second event', metadata: 'metadata of second event'}
          ],
          expectedAggregateVersion: -1
        }
      ],
      transactionId
    })
    ee.on('error', err => done(err))
    ee.on('storedEvents', (events) => {
      should(events.length).equal(2)

      should(isString(events[0].id)).be.True()
      should(events[0].type).equal('TypeOne')
      should(events[0].aggregateIdentity).deepEqual(newAggregateIdentity)
      should(events[0].sequenceNumber).equal(1)
      should(events[0].data).equal('data of first event')
      should(events[0].metadata).equal('metadata of first event')
      should(events[0].transactionId).equal(transactionId)

      should(isString(events[1].id)).be.True()
      should(events[1].type).equal('TypeTwo')
      should(events[1].aggregateIdentity).deepEqual(newAggregateIdentity)
      should(events[1].sequenceNumber).equal(2)
      should(events[1].data).equal('data of second event')
      should(events[1].metadata).equal('metadata of second event')
      should(events[1].transactionId).equal(transactionId)

      getClient()
      .then(client => {
        client.query(`
          SELECT * FROM eventstore.aggregates
          WHERE id = $1
            AND type = $2`,
          [newAggregateIdentity.id, newAggregateIdentity.type],
          (err, result) => {
            client.end()
            if (err) return done(err)
            should(result.rows.length).equal(1)
            should(parseInt(result.rows[0].version, 10)).equal(2)
            done()
          }
        )
      })
    })
  })
  it('creates new aggregates if writing to not existent aggregate\'streams with expectedAggregateVersion === 0', (done) => {
    let transactionId = shortid()
    let newAggregateIdentity = {type: 'Not', id: 'Exists'}
    let ee = backend.storeEvents({
      writeRequests: [
        {
          aggregateIdentity: newAggregateIdentity,
          events: [
            {type: 'TypeOne', data: 'data of first event', metadata: 'metadata of first event'},
            {type: 'TypeTwo', data: 'data of second event', metadata: 'metadata of second event'}
          ],
          expectedAggregateVersion: 0
        }
      ],
      transactionId
    })
    ee.on('error', err => done(err))
    ee.on('storedEvents', (events) => {
      should(events.length).equal(2)

      should(isString(events[0].id)).be.True()
      should(events[0].type).equal('TypeOne')
      should(events[0].aggregateIdentity).deepEqual(newAggregateIdentity)
      should(events[0].sequenceNumber).equal(1)
      should(events[0].data).equal('data of first event')
      should(events[0].metadata).equal('metadata of first event')
      should(events[0].transactionId).equal(transactionId)

      should(isString(events[1].id)).be.True()
      should(events[1].type).equal('TypeTwo')
      should(events[1].aggregateIdentity).deepEqual(newAggregateIdentity)
      should(events[1].sequenceNumber).equal(2)
      should(events[1].data).equal('data of second event')
      should(events[1].metadata).equal('metadata of second event')
      should(events[1].transactionId).equal(transactionId)

      getClient()
      .then(client => {
        client.query(`
          SELECT * FROM eventstore.aggregates
          WHERE id = $1
            AND type = $2`,
          [newAggregateIdentity.id, newAggregateIdentity.type],
          (err, result) => {
            client.end()
            if (err) return done(err)
            should(result.rows.length).equal(1)
            should(parseInt(result.rows[0].version, 10)).equal(2)
            done()
          }
        )
      })
    })
  })
  it('DOES NOT create new aggregates if writing to not existent aggregate\'streams with expectedAggregateVersion > 0', (done) => {
    let transactionId = shortid()
    let newAggregateIdentity = {type: 'Not', id: 'Exists'}
    let ee = backend.storeEvents({
      writeRequests: [
        {
          aggregateIdentity: newAggregateIdentity,
          events: [
            {type: 'TypeOne', data: 'data of first event', metadata: 'metadata of first event'},
            {type: 'TypeTwo', data: 'data of second event', metadata: 'metadata of second event'}
          ],
          expectedAggregateVersion: 1
        }
      ],
      transactionId
    })
    ee.on('error', () => {
      getClient()
      .then(client => {
        client.query(`
          SELECT * FROM eventstore.aggregates
          WHERE id = $1
            AND type = $2`,
          [newAggregateIdentity.id, newAggregateIdentity.type],
          (err, result) => {
            client.end()
            if (err) return done(err)
            should(result.rows.length).equal(0)
            done()
          }
        )
      })
    })
    ee.on('storedEvents', () => done(new Error('should not emit `storedEvents`, but `error`')))
  })
  it('saves events for multiple aggregate streams whithin the same transaction', (done) => {
    let transactionId = shortid()
    let ee = backend.storeEvents({
      writeRequests: [
        {
          aggregateIdentity: aggregate1Identity,
          events: [
            {type: 'TypeOne', data: 'data of first event', metadata: 'metadata of first event'}
          ],
          expectedAggregateVersion: aggregate1.get('version')
        },
        {
          aggregateIdentity: aggregate2Identity,
          events: [
            {type: 'TypeTwo', data: 'data of second event', metadata: 'metadata of second event'}
          ],
          expectedAggregateVersion: aggregate2.get('version')
        }
      ],
      transactionId
    })
    ee.on('error', err => done(err))
    ee.on('storedEvents', (events) => {
      should(events.length).equal(2)

      should(isString(events[0].id)).be.True()
      should(events[0].type).equal('TypeOne')
      should(events[0].aggregateIdentity).deepEqual(aggregate1Identity)
      should(events[0].sequenceNumber).equal(aggregate1.get('version') + 1)
      should(events[0].data).equal('data of first event')
      should(events[0].metadata).equal('metadata of first event')
      should(events[0].transactionId).equal(transactionId)

      should(isString(events[1].id)).be.True()
      should(events[1].type).equal('TypeTwo')
      should(events[1].aggregateIdentity).deepEqual(aggregate2Identity)
      should(events[1].sequenceNumber).equal(aggregate2.get('version') + 1)
      should(events[1].data).equal('data of second event')
      should(events[1].metadata).equal('metadata of second event')
      should(events[1].transactionId).equal(transactionId)

      done()
    })
  })
  it('DOES NOT write any event if the writing to any aggregate stream fails', (done) => {
    let transactionId = shortid()
    let ee = backend.storeEvents({
      writeRequests: [
        {
          aggregateIdentity: aggregate1Identity,
          events: [
            {type: 'TypeOne', data: 'data of first event', metadata: 'metadata of first event'},
            {type: 'TypeTwo', data: 'data of second event', metadata: 'metadata of second event'}
          ],
          expectedAggregateVersion: aggregate1.get('version')
        },
        {
          aggregateIdentity: aggregate2Identity,
          events: [
            {type: 'TypeOne', data: 'data of first event', metadata: 'metadata of first event'},
            {type: 'TypeTwo', data: 'data of second event', metadata: 'metadata of second event'}
          ],
          expectedAggregateVersion: aggregate2.get('version') + 1
        }
      ],
      transactionId
    })
    ee.on('error', () => {
      getClient()
      .then(client => {
        client.query(`
          SELECT * FROM eventstore.events
          WHERE aggregateId = $1
            AND aggregateType = $2
          ORDER BY sequenceNumber DESC
          LIMIT 1`,
          [aggregate1Identity.id, aggregate1Identity.type],
          (err, result) => {
            client.end()
            if (err) return done(err)
            should(parseInt(result.rows[0].sequenceNumber, 10)).equal(aggregate1.get('version'))
            done()
          }
        )
      })
    })
    ee.on('storedEvents', () => done(new Error('should not emit `storedEvents`, but `error`')))
  })
  it('writes to aggregate\'streams within a serialized transaction')
})

describe('Helper eventRecordToDTO(record)', () => {
  it('transforms an events\'table row into a valid DTO representing an event', () => {
    let storedOn = new Date()
    let dbReacord = {
      id: 123,
      type: 'MyEvent',
      aggregateId: 456,
      aggregateType: 'MyAggregate',
      storedOn,
      sequenceNumber: 5,
      data: 'myData',
      metadata: 'myData',
      transactionId: 'abc'
    }
    let expectedDTO = {
      id: 123,
      type: 'MyEvent',
      aggregateIdentity: {
        id: 456,
        type: 'MyAggregate'
      },
      storedOn: storedOn.toISOString(),
      sequenceNumber: 5,
      data: 'myData',
      metadata: 'myData',
      transactionId: 'abc'
    }
    should(eventRecordToDTO(dbReacord)).eql(expectedDTO)
  })
})

function getClient () {
  return new Promise((resolve, reject) => {
    let client = new pg.Client(cockroachCoordinates)
    client.connect((err) => {
      if (err) return reject(err)
      resolve(client)
    })
  })
}
function flushDB () {
  return getClient()
    .then(client => new Promise((resolve, reject) => {
      client.query(`
        CREATE DATABASE IF NOT EXISTS eventstore;
        DROP TABLE IF EXISTS eventstore.snapshots;
        DROP TABLE IF EXISTS eventstore.events;
        DROP TABLE IF EXISTS eventstore.aggregates;`,
        (err) => {
          client.end()
          if (err) return reject(err)
          resolve()
        })
    }))
}
function setupDB () {
  return new Promise((resolve, reject) => {
    backend.setup((err) => {
      if (err) return reject(err)
      resolve()
    })
  })
}
function populateDB () {
  return getClient()
    // Fill the aggregates table
    .then(client => new Promise((resolve, reject) => {
      let aggregatesValues = testData.aggregates.toJS().map(
        ({id, type, version}) => `('${id}', '${type}', ${version})`
      ).join(',')
      let aggregatesInsert = `INSERT INTO eventstore.aggregates VALUES ${aggregatesValues}`

      client.query(aggregatesInsert, (err) => {
        if (err) return reject(err)
        resolve(client)
      })
    }))
    // Fill the events table
    .then(client => new Promise((resolve, reject) => {
      let eventsValues = testData.events.toJS().map(
        ({id, type, aggregateId, aggregateType, storedOn, sequenceNumber, data, metadata, transactionId}) => `(${id}, '${type}', '${aggregateId}', '${aggregateType}', '${storedOn}', ${sequenceNumber}, '${data}', '${metadata}', '${transactionId}')`
      ).join(',')
      let eventsInsert = `INSERT INTO eventstore.events VALUES ${eventsValues}`

      client.query(eventsInsert, (err) => {
        if (err) reject(err)
        resolve(client)
      })
    }))
    // Fill the snapshot table
    .then(client => new Promise((resolve, reject) => {
      let snapshotsValues = testData.snapshots.toJS().map(
        ({aggregateId, aggregateType, version, data}) => `('${aggregateId}', '${aggregateType}', ${version}, '${data}')`
      ).join(',')
      let snapshotsInsert = `INSERT INTO eventstore.snapshots VALUES ${snapshotsValues}`

      client.query(snapshotsInsert, (err) => {
        client.end()
        if (err) return reject(err)
        resolve()
      })
    }))
}
