import path from 'path'
import pg from 'pg'
import { random, min, isString } from 'lodash'
import shortid from 'shortid'
import should from 'should/as-function'
import sinon from 'sinon'
import EventEmitter from 'eventemitter3'

// Load test data in memory
import { getSimulationData } from './InMemorySimulation'
global.testData = getSimulationData()

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
  it('has method .getEventsByStream()', () => {
    should(backend.getEventsByStream).be.a.Function()
  })
  it('has method .getEventsByStreamCategory()', () => {
    should(backend.getEventsByStreamCategory).be.a.Function()
  })
  it('has method .storeEvents()', () => {
    should(backend.storeEvents).be.a.Function()
  })
})

describe('backend.setup(callback(err))', () => {
  before(() => flushDB())

  it('ensures the events table and call callback', (done) => {
    backend.setup((err) => {
      if (err) return done(err)
      getClient().then(client => {
        client.query(
          `SHOW TABLES FROM eventstore`,
          (err, result) => {
            if (err) done(err)
            should(result.rows.map(({Table}) => Table)).containDeep(['events'])
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
describe('backend.getEventsByStream({stream, fromVersionNumber[, limit]})', () => {
  let streamsWithManyVersions = testData.streams.filter(stream => stream.get('version') > 10)
  let testStream = streamsWithManyVersions.get(random(streamsWithManyVersions.size - 1))
  let testStreamEvents = testData.events.filter(event => event.get('stream') === testStream.get('id'))

  it('returns an Event Emitter', () => {
    let results = backend.getEventsByStream({
      stream: testStream.get('id'),
      fromVersionNumber: 0
    })
    should(results).be.an.instanceof(EventEmitter)
  })
  it('returned EE emits `event` for each event fetched', (done) => {
    let results = backend.getEventsByStream({
      stream: testStream.get('id'),
      fromVersionNumber: 0
    })
    let spy = sinon.spy()
    results.on('event', spy)
    results.on('end', () => {
      let spyCalls = spy.getCalls()
      should(spyCalls.length).equal(testStreamEvents.size)
      done()
    })
  })
  it('returned EE emits `end` event when all fetched events have been emitted', (done) => {
    let results = backend.getEventsByStream({
      stream: testStream.get('id'),
      fromVersionNumber: 0
    })
    let c = 0
    results.on('event', () => {
      c++
    })
    results.on('end', () => {
      should(c).equal(testStreamEvents.size)
      done()
    })
  })
  it('returned EE emits just `end` if no events are found', (done) => {
    let results = backend.getEventsByStream({
      stream: testStream.get('id'),
      fromVersionNumber: testStream.get('version') + 1
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
    let results = backend.getEventsByStream({
      stream: testStream.get('id'),
      fromVersionNumber: 0
    })
    let spy = sinon.spy()
    results.on('event', spy)
    results.on('end', () => {
      let spyCalls = spy.getCalls()
      should(spyCalls.map(({args}) => args[0].id)).containDeepOrdered(testStreamEvents.toJS().map(({id}) => id))
      done()
    })
  })
  it('fetching gets all events with `versionNumber` > `fromVersionNumber`', (done) => {
    let storedEvents = testStreamEvents.filter(e => e.get('versionNumber') > 2)
    let results = backend.getEventsByStream({
      stream: testStream.get('id'),
      fromVersionNumber: 2
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
    let storedEvents = testStreamEvents.filter(e => e.get('versionNumber') > 2)
    let limit = random(1, storedEvents.size * 2)
    let results = backend.getEventsByStream({
      stream: testStream.get('id'),
      fromVersionNumber: 2,
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
describe('backend.getEventsByStreamCategory({aggregateTypes, fromEventId[, limit]})', () => {
  let streamsGroupedByCategory = testData.streams.groupBy(stream => stream.get('category'))
  let categoryStreams = streamsGroupedByCategory.sortBy(group => -group.size).first()
  let streamsIds = categoryStreams.map(stream => stream.get('id')).toJS()
  let testCategory = categoryStreams.first().get('category')
  let testEvents = testData.events.filter(event => !!~streamsIds.indexOf(event.get('stream')))

  it('returns an Event Emitter', () => {
    let results = backend.getEventsByStreamCategory({
      streamsCategory: testCategory,
      fromEventId: 0,
      limit: 1
    })
    should(results).be.an.instanceof(EventEmitter)
  })
  it('returned EE emits `event` for each event fetched', (done) => {
    let results = backend.getEventsByStreamCategory({
      streamsCategory: testCategory,
      fromEventId: 0
    })
    let spy = sinon.spy()
    results.on('error', done)
    results.on('event', spy)
    results.on('end', () => {
      let spyCalls = spy.getCalls()
      should(spyCalls.length).equal(testEvents.size)
      done()
    })
  })
  it('returned EE emits `end` event when all fetched events have been emitted', (done) => {
    let results = backend.getEventsByStreamCategory({
      streamsCategory: testCategory,
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
    let results = backend.getEventsByStreamCategory({
      streamsCategory: testCategory,
      fromEventId: 10000000
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
    let results = backend.getEventsByStreamCategory({
      streamsCategory: testCategory,
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
    let results = backend.getEventsByStreamCategory({
      streamsCategory: testCategory,
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
    let results = backend.getEventsByStreamCategory({
      streamsCategory: testCategory,
      fromEventId: storedEvents.get(0).get('id') - 1,
      limit
    })
    let spy = sinon.spy()

    results.on('error', done)
    results.on('event', spy)
    results.on('end', () => {
      let spyCalls = spy.getCalls()
      should(spyCalls.length).equal(min([limit, storedEvents.size]))
      should(spyCalls.map(({args}) => args[0].id)).containDeepOrdered(storedEvents.slice(0, limit).toJS().map(({id}) => id))
      done()
    })
  })
})
describe('backend.storeEvents({writeRequests, transactionId})', () => {
  let streamsRandomized = testData.streams.sortBy(() => Math.random())
  let stream1 = streamsRandomized.get(0)
  let stream1Id = stream1.get('id')
  let stream2 = streamsRandomized.get(1)
  let stream2Id = stream2.get('id')

  beforeEach(function () {
    this.timeout(0)
    return flushDB()
      .then(() => setupDB())
      .then(() => populateDB())
  })

  it('returns an Event Emitter', () => {
    let ee = backend.storeEvents({
      writeRequests: [{
        stream: stream1Id,
        events: [{type: 'test', data: ''}],
        expectedVersionNumber: stream1.get('version')
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
          stream: stream1Id,
          events: [
            {type: 'TypeOne', data: 'data of first event'},
            {type: 'TypeTwo', data: 'data of second event'}
          ],
          expectedVersionNumber: stream1.get('version')
        }
      ],
      transactionId
    })
    ee.on('error', err => done(err))
    ee.on('storedEvents', (events) => {
      should(events.length).equal(2)

      should(isString(events[0].id)).be.True()
      should(events[0].type).equal('TypeOne')
      should(events[0].stream).equal(stream1Id)
      should(events[0].versionNumber).equal(stream1.get('version') + 1)
      should(events[0].data).equal('data of first event')
      should(events[0].transactionId).equal(transactionId)

      should(isString(events[1].id)).be.True()
      should(events[1].type).equal('TypeTwo')
      should(events[1].stream).equal(stream1Id)
      should(events[1].versionNumber).equal(stream1.get('version') + 2)
      should(events[1].data).equal('data of second event')
      should(events[1].transactionId).equal(transactionId)

      done()
    })
  })
  it('returned EE emits `error` if there is a version mismatch', (done) => {
    let transactionId = shortid()
    let ee = backend.storeEvents({
      writeRequests: [
        {
          stream: stream1Id,
          events: [
            {type: 'TypeOne', data: 'data of first event'},
            {type: 'TypeTwo', data: 'data of second event'}
          ],
          expectedVersionNumber: stream1.get('version') - 1
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
  it('returned EE emits `error` if expectedVersionNumber === -1 ad the stream does not exists', (done) => {
    let transactionId = shortid()
    let ee = backend.storeEvents({
      writeRequests: [
        {
          stream: 'Not_Exists',
          events: [
            {type: 'TypeOne', data: 'data of first event'},
            {type: 'TypeTwo', data: 'data of second event'}
          ],
          expectedVersionNumber: -1
        }
      ],
      transactionId
    })
    ee.on('error', err => {
      should(err.message.match(/does\ not\ exist/).length).equal(1)
      done()
    })
    ee.on('storedEvents', () => done(new Error('should not emit `storedEvents`, but `error`')))
  })
  it('creates new streams if writing to not existent streams with expectedVersionNumber === -2', (done) => {
    let transactionId = shortid()
    let ee = backend.storeEvents({
      writeRequests: [
        {
          stream: 'New_Stream',
          events: [
            {type: 'TypeOne', data: 'data of first event'},
            {type: 'TypeTwo', data: 'data of second event'}
          ],
          expectedVersionNumber: -2
        }
      ],
      transactionId
    })
    ee.on('error', err => done(err))
    ee.on('storedEvents', (events) => {
      should(events.length).equal(2)

      should(isString(events[0].id)).be.True()
      should(events[0].type).equal('TypeOne')
      should(events[0].stream).equal('New_Stream')
      should(events[0].versionNumber).equal(1)
      should(events[0].data).equal('data of first event')
      should(events[0].transactionId).equal(transactionId)

      should(isString(events[1].id)).be.True()
      should(events[1].type).equal('TypeTwo')
      should(events[1].stream).equal('New_Stream')
      should(events[1].versionNumber).equal(2)
      should(events[1].data).equal('data of second event')
      should(events[1].transactionId).equal(transactionId)

      getClient()
      .then(client => {
        client.query(`
          SELECT * FROM eventstore.events
          WHERE stream = $1
          ORDER BY id DESC
          LIMIT 1`,
          ['New_Stream'],
          (err, result) => {
            client.end()
            if (err) return done(err)
            should(result.rows.length).equal(1)
            should(parseInt(result.rows[0].versionNumber, 10)).equal(2)
            done()
          }
        )
      })
    })
  })
  it('saves events for multiple streams whithin the same transaction', (done) => {
    let transactionId = shortid()
    let ee = backend.storeEvents({
      writeRequests: [
        {
          stream: stream1Id,
          events: [
            {type: 'TypeOne', data: 'data of first event'}
          ],
          expectedVersionNumber: stream1.get('version')
        },
        {
          stream: stream2Id,
          events: [
            {type: 'TypeTwo', data: 'data of second event'}
          ],
          expectedVersionNumber: stream2.get('version')
        }
      ],
      transactionId
    })
    ee.on('error', err => done(err))
    ee.on('storedEvents', (events) => {
      should(events.length).equal(2)

      should(isString(events[0].id)).be.True()
      should(events[0].type).equal('TypeOne')
      should(events[0].stream).equal(stream1Id)
      should(events[0].versionNumber).equal(stream1.get('version') + 1)
      should(events[0].data).equal('data of first event')
      should(events[0].transactionId).equal(transactionId)

      should(isString(events[1].id)).be.True()
      should(events[1].type).equal('TypeTwo')
      should(events[1].stream).equal(stream2Id)
      should(events[1].versionNumber).equal(stream2.get('version') + 1)
      should(events[1].data).equal('data of second event')
      should(events[1].transactionId).equal(transactionId)

      done()
    })
  })
  it('DOES NOT write any event if the writing to any stream fails', (done) => {
    let transactionId = shortid()
    let ee = backend.storeEvents({
      writeRequests: [
        {
          stream: stream1Id,
          events: [
            {type: 'TypeOne', data: 'data of first event'},
            {type: 'TypeTwo', data: 'data of second event'}
          ],
          expectedVersionNumber: stream1.get('version')
        },
        {
          stream: stream2Id,
          events: [
            {type: 'TypeOne', data: 'data of first event'},
            {type: 'TypeTwo', data: 'data of second event'}
          ],
          expectedVersionNumber: stream2.get('version') - 1
        }
      ],
      transactionId
    })
    ee.on('error', () => {
      getClient()
      .then(client => {
        client.query(`
          SELECT * FROM eventstore.events
          WHERE stream = $1
          ORDER BY versionNumber DESC
          LIMIT 1`,
          [stream1Id],
          (err, result) => {
            client.end()
            if (err) return done(err)
            should(parseInt(result.rows[0].versionNumber, 10)).equal(stream1.get('version'))
            done()
          }
        )
      })
    })
    ee.on('storedEvents', () => done(new Error('should not emit `storedEvents`, but `error`')))
  })
})

describe('Helper eventRecordToDTO(record)', () => {
  it('transforms an events\'table row into a valid DTO representing an event', () => {
    let stored = new Date()
    let dbReacord = {
      id: 123,
      stream: 'StreamX',
      type: 'MyEvent',
      stored,
      versionNumber: 5,
      data: 'myData',
      transactionId: 'abc'
    }
    let expectedDTO = {
      id: 123,
      stream: 'StreamX',
      type: 'MyEvent',
      stored: stored.toISOString(),
      versionNumber: 5,
      data: 'myData',
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
        DROP TABLE IF EXISTS eventstore.events;`,
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
    // Fill the events table
    .then(client => new Promise((resolve, reject) => {
      let eventsValues = testData.events.toJS().map(
        ({id, stream, type, versionNumber, stored, data, transactionId}) => `(${id}, '${stream}', '${type}', ${versionNumber}, '${stored}', '${data}', '${transactionId}')`
      ).join(',')

      let eventsInsert = `INSERT INTO eventstore.events VALUES ${eventsValues}`

      client.query(eventsInsert, (err) => {
        client.end()
        if (err) reject(err)
        resolve()
      })
    }))
}
