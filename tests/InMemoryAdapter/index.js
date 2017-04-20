import fs from 'fs'
import path from 'path'
import shortid from 'shortid'
import EventEmitter from 'eventemitter3'
import should from 'should/as-function'
import {
  sample,
  every,
  uniq,
  sortBy,
  isString
} from 'lodash'

const JSON_FILE = path.resolve(__dirname, 'events.json')
const events = require(JSON_FILE)
const streamsByName = events.reduce((map, event) => {
  let stream = map[event.stream]
  if (!stream) {
    map[event.stream] = {
      name: event.stream,
      category: event.stream.split('::')[0],
      version: event.versionNumber
    }
  } else {
    stream.version = event.versionNumber
  }
  return map
}, {})
const streams = Object.keys(streamsByName).map(stream => streamsByName[stream])
const eventsByStreamsCategory = streamsCategory => events.filter(({stream}) => stream === streamsCategory || stream.split('::')[0] === streamsCategory)

const libFolder = `../../${process.env.LIB_FOLDER}`

const zeropad = require(`../../${process.env.LIB_FOLDER}/utils.js`).zeropad

const InMemoryAdapter = require(`${libFolder}/DbAdapters/InMemory`).default
const {
  ANY_VERSION_NUMBER,
  ANY_POSITIVE_VERSION_NUMBER
} = require(`${libFolder}`)

const getAdapter = (JSONFile) => InMemoryAdapter(JSONFile ? {JSONFile} : {})

describe('InMemoryAdapter([config])', () => {
  it('is a function', () => should(InMemoryAdapter).be.a.Function())
  it('passing `config` is optional', () => {
    should(() => {
      InMemoryAdapter()
    }).not.throw()
  })
  it('throws if config.JSONFile is truthy and is not a path to a file', () => {
    should(() => {
      InMemoryAdapter({JSONFile: 'notexist'})
    }).throw(new RegExp('config.JSONFile MUST be either falsy or a path of a json file containing a list of events'))
    should(() => {
      InMemoryAdapter({JSONFile: JSON_FILE})
    }).not.throw()
  })
})

describe('db = InMemoryAdapter(config)', () => {
  it('is an event emitter', () => should(InMemoryAdapter()).be.an.instanceOf(EventEmitter))
  it('db.getEvents() is a function', () => should(InMemoryAdapter().getEvents).be.a.Function())
  it('db.getEventsByStream() is a function', () => should(InMemoryAdapter().getEventsByStream).be.a.Function())
  it('db.getEventsByStreamsCategory() is a function', () => should(InMemoryAdapter().getEventsByStreamsCategory).be.a.Function())
  it('db.appendEvents() is a function', () => should(InMemoryAdapter().appendEvents).be.a.Function())
  it('emits `update` when new events are appended to the store', (done) => {
    let db = getAdapter(JSON_FILE)
    let transactionId = shortid()

    let initialEvents = db.internalEvents

    db.on('update', () => {
      let finalEvents = db.internalEvents
      should(finalEvents.length).equal(initialEvents.length + 2)
      done()
    })

    db.appendEvents({
      appendRequests: [
        {
          stream: 'a-stream',
          events: [
            {type: shortid(), data: ''},
            {type: shortid(), data: ''}
          ],
          expectedVersionNumber: ANY_VERSION_NUMBER
        }
      ],
      transactionId
    })
  })
  it('db.internalEvents is a getter for the list of events in memory', () => {
    let db = getAdapter(JSON_FILE)
    should(db.internalEvents).eql(events)
  })
})

describe('dbResults = db.getEvents({fromEventId[, limit]})', () => {
  it('is an event emitter', (done) => {
    let db = getAdapter()
    let dbResults = db.getEvents({fromEventId: 0})

    should(dbResults).be.an.instanceOf(EventEmitter)
    dbResults.on('error', done)
    dbResults.on('end', () => done())
  })
  it('emits `event` for each event fetched and then emits `end`', (done) => {
    let db = getAdapter(JSON_FILE)
    let dbResults = db.getEvents({fromEventId: 0})

    let fetchedEvents = []
    dbResults.on('event', (event) => fetchedEvents.push(event))
    dbResults.on('end', () => {
      should(fetchedEvents.map(({data}) => data)).eql(events.map(({data}) => data))
      should(fetchedEvents.length).equal(events.length)
      done()
    })
  })
  it('emits just `end` if no events are found', (done) => {
    let db = getAdapter()
    let dbResults = db.getEvents({fromEventId: 0})

    dbResults.on('event', (event) => done(new Error()))
    dbResults.on('end', () => done())
  })
  it('emits the events ordered by `id`', (done) => {
    let db = getAdapter()
    let dbResults = db.getEvents({fromEventId: 0})

    let fetchedEvents = []
    dbResults.on('event', (event) => fetchedEvents.push(event))
    dbResults.on('end', () => {
      let idList = fetchedEvents.map(({id}) => id)
      let sortedIdList = idList.slice().sort()
      should(idList).eql(sortedIdList)
      done()
    })
  })
  it('emits just events with `id` > `fromEventId`', (done) => {
    let splitEvent = sample(events)
    let expectedEvents = events.filter(({id}) => parseInt(id) > parseInt(splitEvent.id))

    let db = getAdapter(JSON_FILE)
    let dbResults = db.getEvents({fromEventId: parseInt(splitEvent.id)})

    let fetchedEvents = []
    dbResults.on('event', (event) => fetchedEvents.push(event))
    dbResults.on('end', () => {
      should(fetchedEvents.map(({data}) => data)).eql(expectedEvents.map(({data}) => data))
      done()
    })
  })
  it('takes in to account `limit` param if provided', (done) => {
    let db = getAdapter(JSON_FILE)
    let dbResults = db.getEvents({fromEventId: 0, limit: 8})

    let fetchedEvents = []
    dbResults.on('event', (event) => fetchedEvents.push(event))
    dbResults.on('end', () => {
      should(fetchedEvents.length).equal(8)
      done()
    })
  })
})
describe('dbResults = db.getEventsByStream({stream, fromVersionNumber[, limit]})', () => {
  it('is an event emitter', (done) => {
    let db = getAdapter(JSON_FILE)
    let dbResults = db.getEventsByStream({stream: streams[0].name, fromVersionNumber: 0})

    should(dbResults).be.an.instanceOf(EventEmitter)
    dbResults.on('end', () => done())
  })
  it('emits `event` for each event fetched and then emits `end`', (done) => {
    let testStream = sample(streams)
    let db = getAdapter(JSON_FILE)
    let dbResults = db.getEventsByStream({stream: testStream.name, fromVersionNumber: 0})

    let fetchedEvents = []
    dbResults.on('event', (event) => fetchedEvents.push(event))
    dbResults.on('end', () => {
      should(fetchedEvents.length).equal(testStream.version)
      done()
    })
  })
  it('emits just `end` if no events are found', (done) => {
    let db = getAdapter(JSON_FILE)
    let dbResults = db.getEventsByStream({stream: 'notexistent', fromVersionNumber: 0})

    let fetchedEvents = []
    dbResults.on('event', (event) => fetchedEvents.push(event))
    dbResults.on('end', () => {
      should(fetchedEvents.length).equal(0)
      done()
    })
  })
  it('emits the events ordered by `id`', (done) => {
    let testStream = sample(streams)
    let db = getAdapter(JSON_FILE)
    let dbResults = db.getEventsByStream({stream: testStream.name, fromVersionNumber: 0})

    let fetchedEvents = []
    dbResults.on('event', (event) => fetchedEvents.push(event))
    dbResults.on('end', () => {
      let idList = fetchedEvents.map(({id}) => parseInt(id, 10))
      let sortedIdList = sortBy(idList)
      should(idList).eql(sortedIdList)
      done()
    })
  })
  it('emits just events with `versionNumber` > `fromVersionNumber`', (done) => {
    let testStream = sample(streams)
    let streamEvents = events.filter(({stream}) => stream === testStream.name)
    let splitEvent = sample(streamEvents)
    let expectedEvents = streamEvents.filter(({id}) => id > splitEvent.id)

    let db = getAdapter(JSON_FILE)
    let dbResults = db.getEventsByStream({stream: testStream.name, fromVersionNumber: splitEvent.versionNumber})

    let fetchedEvents = []
    dbResults.on('event', (event) => fetchedEvents.push(event))
    dbResults.on('end', () => {
      should(fetchedEvents.map(({data}) => data)).eql(expectedEvents.map(({data}) => data))
      done()
    })
  })
  it('takes in to account `limit` param if provided', (done) => {
    let testStream = sample(streams)
    let db = getAdapter(JSON_FILE)
    let dbResults = db.getEventsByStream({stream: testStream.name, fromVersionNumber: 0, limit: 1})

    let fetchedEvents = []
    dbResults.on('event', (event) => fetchedEvents.push(event))
    dbResults.on('end', () => {
      should(fetchedEvents.length).equal(1)
      done()
    })
  })
})
describe('dbResults = db.getEventsByStreamsCategory({streamsCategory, fromEventId[, limit]})', () => {
  it('is an event emitter', (done) => {
    let db = getAdapter()
    let dbResults = db.getEventsByStreamsCategory({streamsCategory: 'test', fromEventId: 0})

    should(dbResults).be.an.instanceOf(EventEmitter)
    dbResults.on('end', () => done())
  })
  it('emits `event` for each event fetched and then emits `end`', (done) => {
    let testStream = sample(streams)
    let db = getAdapter(JSON_FILE)
    let dbResults = db.getEventsByStreamsCategory({streamsCategory: testStream.category, fromEventId: 0})
    let expectedEvents = eventsByStreamsCategory(testStream.category)

    let fetchedEvents = []
    dbResults.on('event', (event) => fetchedEvents.push(event))
    dbResults.on('end', () => {
      should(fetchedEvents.length).equal(expectedEvents.length)
      done()
    })
  })
  it('emits just `end` if no events are found', (done) => {
    let db = getAdapter()
    let dbResults = db.getEventsByStreamsCategory({streamsCategory: 'notexistent', fromEventId: 0})

    let fetchedEvents = []
    dbResults.on('event', (event) => fetchedEvents.push(event))
    dbResults.on('end', () => {
      should(fetchedEvents.length).equal(0)
      done()
    })
  })
  it('emits the events ordered by `id`', (done) => {
    let testStream = sample(streams)
    let db = getAdapter()
    let dbResults = db.getEventsByStreamsCategory({streamsCategory: testStream.category, fromEventId: 0})

    let fetchedEvents = []
    dbResults.on('event', (event) => fetchedEvents.push(event))
    dbResults.on('end', () => {
      let idList = fetchedEvents.map(({id}) => parseInt(id))
      let sortedIdList = sortBy(idList)
      should(idList).eql(sortedIdList)
      done()
    })
  })
  it('emits just events with `id` > `fromEventId`', (done) => {
    let testStream = sample(streams)
    let expectedEvents = eventsByStreamsCategory(testStream.category)
    let splitEvent = sample(expectedEvents)
    expectedEvents = expectedEvents.filter(({id}) => parseInt(id) > parseInt(splitEvent.id))

    let db = getAdapter(JSON_FILE)
    let dbResults = db.getEventsByStreamsCategory({streamsCategory: testStream.category, fromEventId: splitEvent.id})

    let fetchedEvents = []
    dbResults.on('event', (event) => fetchedEvents.push(event))
    dbResults.on('end', () => {
      should(fetchedEvents.map(({data}) => data)).eql(expectedEvents.map(({data}) => data))
      done()
    })
  })
  it('takes in to account `limit` param if provided', (done) => {
    let testStream = sample(streams)

    let db = getAdapter(JSON_FILE)
    let dbResults = db.getEventsByStreamsCategory({streamsCategory: testStream.category, fromEventId: 0, limit: 1})

    let fetchedEvents = []
    dbResults.on('event', (event) => fetchedEvents.push(event))
    dbResults.on('end', () => {
      should(fetchedEvents.length).equal(1)
      done()
    })
  })
})
describe('dbResults = db.appendEvents({appendRequests, transactionId})', () => {
  it('is an event emitter', () => {
    let db = getAdapter()
    let dbResults = db.appendEvents({appendRequests: [], transactionId: shortid()})

    should(dbResults).be.an.instanceOf(EventEmitter)
  })
  it('emits `storedEvents` with a list of created events, ordered by id ASC', (done) => {
    let db = getAdapter(JSON_FILE)
    let transactionId = shortid()

    let dbResults = db.appendEvents({
      appendRequests: [
        {
          stream: 'aNewStream',
          events: [
            {type: 'ThisHappened', data: 'one'},
            {type: 'ThatHappened', data: 'two'}
          ],
          expectedVersionNumber: ANY_VERSION_NUMBER
        },
        {
          stream: 'anotherStream',
          events: [
            {type: 'ThisHappened', data: 'one'},
            {type: 'ThatHappened', data: 'two'}
          ],
          expectedVersionNumber: ANY_VERSION_NUMBER
        }
      ],
      transactionId
    })

    dbResults.on('error', done)
    dbResults.on('storedEvents', (storedEvents) => {
      should(storedEvents).containDeepOrdered([
        {stream: 'aNewStream', type: 'ThisHappened', data: 'one', transactionId},
        {stream: 'aNewStream', type: 'ThatHappened', data: 'two', transactionId},
        {stream: 'anotherStream', type: 'ThisHappened', data: 'one', transactionId},
        {stream: 'anotherStream', type: 'ThatHappened', data: 'two', transactionId}
      ])

      should(every(storedEvents, ({id}) => isString(id) && /^\d+$/.test(id))).be.True('Events ids are string representations of integers')
      should(every(storedEvents, ({storedOn}) => isString(storedOn) && (new Date(storedOn)).toISOString() === storedOn)).be.True('event.storedOn is a string representing a valid date')

      let eventsIds = storedEvents.map(({id}) => zeropad(id, 20))
      should(eventsIds.slice().sort()).eql(eventsIds)
      done()
    })
  })
  it('emits `error` if there is a version mismatch', (done) => {
    let db = getAdapter()
    let transactionId = shortid()

    let testStream = sample(streams)

    let dbResults = db.appendEvents({
      appendRequests: [
        {
          stream: testStream.name,
          events: [
            {type: 'ThisHappened', data: 'one'},
            {type: 'ThatHappened', data: 'two'}
          ],
          expectedVersionNumber: testStream.version - 1
        }
      ],
      transactionId
    })

    dbResults.on('error', (err) => {
      should(err.message.indexOf('CONSISTENCY|')).equal(0)
      let jsonErrors = JSON.parse(err.message.split('|')[1])
      should(jsonErrors).containDeepOrdered([
        {
          stream: testStream.name,
          reason: 'STREAM_VERSION_MISMATCH'
        }
      ])
      done()
    })
    dbResults.on('storedEvents', () => done(new Error('should emit error')))
  })
  it('emits `error` if expectedVersionNumber === ANY_POSITIVE_VERSION_NUMBER ad the stream does not exist', (done) => {
    let db = getAdapter()
    let transactionId = shortid()

    let dbResults = db.appendEvents({
      appendRequests: [
        {
          stream: 'notExistent',
          events: [
            {type: 'aType', data: ''}
          ],
          expectedVersionNumber: ANY_POSITIVE_VERSION_NUMBER
        }
      ],
      transactionId
    })

    dbResults.on('error', (err) => {
      should(err.message.indexOf('CONSISTENCY|')).equal(0)
      let jsonErrors = JSON.parse(err.message.split('|')[1])
      should(jsonErrors).containDeepOrdered([
        {
          stream: 'notExistent',
          reason: 'STREAM_DOES_NOT_EXIST'
        }
      ])
      done()
    })
    dbResults.on('storedEvents', () => done(new Error('should emit error')))
  })
  it('DOES NOT write any event if the writing to any stream fails', (done) => {
    let db = getAdapter(JSON_FILE)
    let transactionId = shortid()

    let testStream = sample(streams)
    let totalEvents = events.length

    let dbResults = db.appendEvents({
      appendRequests: [
        {
          stream: testStream.name,
          events: [
            {type: shortid(), data: ''},
            {type: shortid(), data: ''}
          ],
          expectedVersionNumber: testStream.version - 1
        },
        {
          stream: 'newStream',
          events: [
            {type: shortid(), data: ''}
          ],
          expectedVersionNumber: 0
        }
      ],
      transactionId
    })

    dbResults.on('error', () => {
      let evts = JSON.parse(fs.readFileSync(JSON_FILE))
      should(totalEvents).equal(evts.length)
      done()
    })
    dbResults.on('storedEvents', () => done(new Error('should not emit stored events')))
  })
  it('creates a new stream if writing to a not existent stream with expectedVersionNumber === ANY_VERSION_NUMBER', (done) => {
    let db = getAdapter(JSON_FILE)
    let transactionId = shortid()

    let dbEvents = db.internalEvents

    let dbResults = db.appendEvents({
      appendRequests: [
        {
          stream: 'notExistent',
          events: [
            {type: 'aType', data: ''}
          ],
          expectedVersionNumber: ANY_VERSION_NUMBER
        }
      ],
      transactionId
    })

    dbResults.on('error', done)
    dbResults.on('storedEvents', (storedEvents) => {
      let finalEvents = db.internalEvents
      should(finalEvents.length).equal(dbEvents.length + 1)
      should(finalEvents.filter(({stream}) => stream === 'notExistent').length).equal(1)
      done()
    })
  })
  it('saves events for multiple streams whithin the same transaction', (done) => {
    let db = getAdapter(JSON_FILE)
    let transactionId = shortid()

    let testStream = sample(streams)

    let dbResults = db.appendEvents({
      appendRequests: [
        {
          stream: testStream.name,
          events: [
            {type: shortid(), data: ''},
            {type: shortid(), data: ''}
          ],
          expectedVersionNumber: testStream.version
        }
      ],
      transactionId
    })

    dbResults.on('error', done)
    dbResults.on('storedEvents', (storedEvents) => {
      let transactions = uniq(storedEvents.map(({transactionId}) => transactionId))
      should(transactions.length).equal(1)
      should(transactions[0]).equal(transactionId)
      done()
    })
  })
})
