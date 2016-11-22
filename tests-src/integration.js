import grpc from 'grpc'
import path from 'path'
import pg from 'pg'
import should from 'should/as-function'
import Immutable from 'immutable'
import { noop } from 'lodash'

var codePath = path.resolve(__dirname, '..', process.env.CODE_PATH)
var EventStoreProtocol = require(codePath).EventStoreProtocol

// Load test data in memory
let data = require('./testData.json')
global.testData = {
  aggregates: Immutable.fromJS(data.aggregates),
  events: Immutable.fromJS(data.events),
  snapshots: Immutable.fromJS(data.snapshots)
}

describe('Connection', function () {
  it('clients can connect', function (done) {
    let connections = 0
    function onConnection () {
      connections++
      if (connections === 2) done()
    }
    let {writer, subscriber} = getActors()
    grpc.waitForClientReady(writer, 100, onConnection)
    grpc.waitForClientReady(subscriber, 100, onConnection)
  })
})

describe('Ping', function () {
  it('works', (done) => {
    let {subscriber} = getActors()
    subscriber.ping({}, (err) => done(err))
  })
})
describe('GetUid', function () {
  it('returns a unique identifier', (done) => {
    let {subscriber} = getActors()
    subscriber.getUid({}, (err, response) => {
      if (err) return done(err)
      should(response.uid).be.a.String()
      done()
    })
  })
})

describe('SubscribeToStoreStream', () => {
  beforeEach(function () {
    this.timeout(0)
    return flushDB().then(() => populateDB())
  })
  it('provides a continuous stream of events generated after the call', (done) => {
    let {writer, subscriber} = getActors()
    let receivedEvents = 0

    let readCall = subscriber.subscribeToStoreStream({})
    readCall.on('data', onEvent)
    function onEvent (event) {
      receivedEvents++
      validateStoredEvent(event)
      should(event.type).equal(`Evt${receivedEvents}`)
      if (receivedEvents === 4) {
        readCall.cancel()
        done()
      }
    }

    function storeEvents (n) {
      writer.writeToAggregateStream({
        aggregateIdentity: {type: 'Aggregate', id: '123'},
        expectedAggregateVersion: -1,
        events: [
          {type: `Evt${n}`, data: 'one'},
          {type: `Evt${n + 1}`, data: 'two'}
        ]
      }, noop)
    }
    setTimeout(() => storeEvents(1), 10)
    setTimeout(() => storeEvents(3), 100)
  })
})
describe('SubscribeToStoreStreamFromEvent', function () {
  beforeEach(function () {
    this.timeout(0)
    return flushDB().then(() => populateDB())
  })
  it('provides a continuous stream of events generated after a certain one', (done) => {
    let last4Events = testData.events.takeLast(4)
    let from = last4Events.first().toJS()
    let storedEvents = last4Events.rest().toJS()

    let {writer, subscriber} = getActors()
    let receivedEvents = []

    function onEvent (event) {
      receivedEvents.push(event)
      validateStoredEvent(event)
      if (receivedEvents.length === 5) {
        readCall.cancel()
        test()
      }
    }
    function test () {
      receivedEvents.forEach(validateStoredEvent)
      storedEvents.forEach((e, i) => {
        should(receivedEvents[i].id).equal(e.id)
      })
      should(receivedEvents[3].type).equal('Evt1')
      should(receivedEvents[4].type).equal('Evt2')
      done()
    }

    let readCall = subscriber.subscribeToStoreStreamFromEvent({
      fromEventId: from.id
    })
    readCall.on('data', onEvent)
    writer.writeToAggregateStream({
      aggregateIdentity: {type: 'Aggregate', id: '123'},
      expectedAggregateVersion: -1,
      events: [
        {type: `Evt1`, data: 'one'},
        {type: `Evt2`, data: 'two'}
      ]
    }, noop)
  })
})
describe('ReadStoreStreamForwardFromEvent', function () {
  beforeEach(function () {
    this.timeout(0)
    return flushDB().then(() => populateDB())
  })
  it('provides an ending stream of events generated after a certain one and until call time')
})

describe('SubscribeToAggregateStream', function () {
  beforeEach(function () {
    this.timeout(0)
    return flushDB().then(() => populateDB())
  })
  it('provides a continuous stream of an aggregate\'s events generated after the call')
})
describe('SubscribeToAggregateStreamFromVersion', function () {
  beforeEach(function () {
    this.timeout(0)
    return flushDB().then(() => populateDB())
  })
  it('provides a continuous stream of an aggregate\'s events generated after a certain one')
})
describe('ReadAggregateStreamForwardFromVersion', function () {
  beforeEach(function () {
    this.timeout(0)
    return flushDB().then(() => populateDB())
  })
  it('provides an ending stream of an aggregate\'s events generated after a certain one and until call time')
})
describe('GetLastAggregateSnapshot', function () {
  beforeEach(function () {
    this.timeout(0)
    return flushDB().then(() => populateDB())
  })
  it('provides the last snapshot of an aggregate')
})

describe('SubscribeToAggregateTypesStream', function () {
  beforeEach(function () {
    this.timeout(0)
    return flushDB().then(() => populateDB())
  })
  it('provides a continuous stream of events of certain aggregate types generated after the call')
})
describe('SubscribeToAggregateTypesStreamFromEvent', function () {
  beforeEach(function () {
    this.timeout(0)
    return flushDB().then(() => populateDB())
  })
  it('provides a continuous stream of events of certain aggregate types generated after a certain one')
})
describe('ReadAggregateTypesStreamForwardFromEvent', function () {
  beforeEach(function () {
    this.timeout(0)
    return flushDB().then(() => populateDB())
  })
  it('provides an ending stream of events of certain aggregate types generated after a certain one and until call time')
})

describe('SubscribeToEventTypesStream', function () {
  beforeEach(function () {
    this.timeout(0)
    return flushDB().then(() => populateDB())
  })
  it('provides a continuous stream of events of certain types generated after the call')
})
describe('SubscribeToEventTypesStreamFromEvent', function () {
  beforeEach(function () {
    this.timeout(0)
    return flushDB().then(() => populateDB())
  })
  it('provides a continuous stream of events of certain types generated after a certain one')
})
describe('ReadEventTypesStreamForwardFromEvent', function () {
  beforeEach(function () {
    this.timeout(0)
    return flushDB().then(() => populateDB())
  })
  it('provides an ending stream of events of certain types generated after a certain one and until call time')
})

describe('WriteToAggregateStream', function () {
  beforeEach(function () {
    this.timeout(0)
    return flushDB().then(() => populateDB())
  })
  it('stores a serie of events for an aggregate and returns the stored events')
})
describe('WriteToMultipleAggregateStreams', function () {
  beforeEach(function () {
    this.timeout(0)
    return flushDB().then(() => populateDB())
  })
  it('stores multiple series of events for multiple aggregates and returns the stored events')
})

function getActors () {
  return {
    writer: new EventStoreProtocol.EventStore(`${process.env.WRITER_HOST}:50051`, grpc.credentials.createInsecure()),
    subscriber: new EventStoreProtocol.EventStore(`${process.env.SUBSCRIBER_HOST}:50051`, grpc.credentials.createInsecure())
  }
}

let cockroachCoordinates = {
  host: 'cockroach',
  port: 26257,
  user: 'root'
}
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
        TRUNCATE eventstore.snapshots, eventstore.events, eventstore.aggregates;`,
        (err) => {
          client.end()
          if (err) return reject(err)
          resolve()
        })
    }))
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
function validateStoredEvent (evt) {
  should(evt.id).be.a.Number()
  should(evt.type).be.a.String()
  should(evt.aggregateIdentity).be.an.Object()
  should(evt.aggregateIdentity.type).be.a.String()
  should(evt.aggregateIdentity.id).be.a.String()
  should(evt.storedOn).be.a.String()
  should((new Date(evt.storedOn)).toISOString()).equal(evt.storedOn)
  should(evt.sequenceNumber).be.a.Number()
  should(evt.sequenceNumber).be.above(0)
  should(evt.data).be.a.String()
  should(evt.metadata).be.a.String()
  should(evt.transactionId).be.a.String()
}
