import shortid from 'shortid'
import EventEmitter from 'eventemitter3'
import should from 'should/as-function'
import {
  sample,
  every,
  uniq,
  isString,
  shuffle
} from 'lodash'

import {
  streams,
  events,
  createEventsTable,
  truncateEventsTable,
  populateEventsTable,
  getDbStreams,
  getEventsCount
} from './dbTestUtils'

const libFolder = `../../${process.env.LIB_FOLDER}`

const zeropad = require(`../../${process.env.LIB_FOLDER}/utils.js`).zeropad

const CockroachDBAdapter = require(`${libFolder}/DbAdapters/CockroachDB`).default
const {
  ANY_VERSION_NUMBER,
  ANY_POSITIVE_VERSION_NUMBER
} = require(`${libFolder}`)

const getAdapter = () => CockroachDBAdapter({host: 'cockroachdb'})

describe('CockroachDBAdapter([config])', () => {
  it('is a function', () => should(CockroachDBAdapter).be.a.Function())
  it('CockroachDBAdapter.createTableSQL([tableName]) is a function', () => should(CockroachDBAdapter.createTableSQL).be.a.Function())
  it('CockroachDBAdapter.createTableSQL([tableName]) returns a `CREATE TABLE` sql query', () => {
    let defaultSQL = CockroachDBAdapter.createTableSQL()
    let customSQL = CockroachDBAdapter.createTableSQL('mytable')

    should(defaultSQL).be.a.String()
    should(defaultSQL.indexOf('CREATE TABLE IF NOT EXISTS events')).equal(0)
    should(customSQL).be.a.String()
    should(customSQL.indexOf('CREATE TABLE IF NOT EXISTS mytable')).equal(0)
  })
  it('passing `config` is optional', () => {
    should(() => {
      CockroachDBAdapter()
    }).not.throw()
  })
  it('throws if config.host is not a non empty string', () => {
    should(() => {
      CockroachDBAdapter({host: ''})
    }).throw(new RegExp('config.host MUST be a non empty string'))
    should(() => {
      CockroachDBAdapter({host: 3})
    }).throw(new RegExp('config.host MUST be a non empty string'))
    should(() => {
      CockroachDBAdapter({host: 'test'})
    }).not.throw()
  })
  it('throws if config.port is not a positive integer', () => {
    should(() => {
      CockroachDBAdapter({port: 0})
    }).throw()
    should(() => {
      CockroachDBAdapter({port: ''})
    }).throw()
    should(() => {
      CockroachDBAdapter({port: 1000})
    }).not.throw()
  })
  it('throws if config.database is not a non empty string', () => {
    should(() => {
      CockroachDBAdapter({database: ''})
    }).throw(new RegExp('config.database MUST be a non empty string'))
    should(() => {
      CockroachDBAdapter({database: 3})
    }).throw(new RegExp('config.database MUST be a non empty string'))
    should(() => {
      CockroachDBAdapter({database: 'test'})
    }).not.throw()
  })
  it('throws if config.table is not a non empty string', () => {
    should(() => {
      CockroachDBAdapter({table: ''})
    }).throw(new RegExp('config.table MUST be a non empty string'))
    should(() => {
      CockroachDBAdapter({table: 3})
    }).throw(new RegExp('config.table MUST be a non empty string'))
    should(() => {
      CockroachDBAdapter({table: 'test'})
    }).not.throw()
  })
  it('throws if config.user is not a non empty string', () => {
    should(() => {
      CockroachDBAdapter({user: ''})
    }).throw(new RegExp('config.user MUST be a non empty string'))
    should(() => {
      CockroachDBAdapter({user: 3})
    }).throw(new RegExp('config.user MUST be a non empty string'))
    should(() => {
      CockroachDBAdapter({user: 'test'})
    }).not.throw()
  })
  it('throws if config.maxPoolClients is not a positive integer', () => {
    should(() => {
      CockroachDBAdapter({maxPoolClients: ''})
    }).throw(new RegExp('config.maxPoolClients MUST be a positive integer'))
    should(() => {
      CockroachDBAdapter({maxPoolClients: 0})
    }).throw(new RegExp('config.maxPoolClients MUST be a positive integer'))
    should(() => {
      CockroachDBAdapter({maxPoolClients: 10})
    }).not.throw()
  })
  it('throws if config.minPoolClients is truthy and is not both a positive integer and < config.maxPoolClients', () => {
    should(() => {
      CockroachDBAdapter({minPoolClients: 'x'})
    }).throw(new RegExp('config.minPoolClients MUST be a positive integer lower than config.maxPoolClients'))
    should(() => {
      CockroachDBAdapter({minPoolClients: -1})
    }).throw(new RegExp('config.minPoolClients MUST be a positive integer lower than config.maxPoolClients'))
    should(() => {
      CockroachDBAdapter({maxPoolClients: 5, minPoolClients: 10})
    }).throw(new RegExp('config.minPoolClients MUST be a positive integer lower than config.maxPoolClients'))
    should(() => {
      CockroachDBAdapter({minPoolClients: 2})
    }).not.throw()
  })
  it('throws if config.idleTimeoutMillis is not an integer >= 1000', () => {
    should(() => {
      CockroachDBAdapter({idleTimeoutMillis: ''})
    }).throw(new RegExp('config.idleTimeoutMillis MUST be a positive integer higher then 999'))
    should(() => {
      CockroachDBAdapter({idleTimeoutMillis: 100})
    }).throw(new RegExp('config.idleTimeoutMillis MUST be a positive integer higher then 999'))
    should(() => {
      CockroachDBAdapter({idleTimeoutMillis: 1000})
    }).not.throw()
  })
  it('throws if config.ssl is not valid', () => {
    should(() => {
      CockroachDBAdapter({
        ssl: 4
      })
    }).throw()
    should(() => {
      CockroachDBAdapter({
        ssl: {}
      })
    }).throw()
    should(() => {
      const ssl = {
        ca: 'xyz',
        cert: 'xyz',
        key: 'xyz'
      }

      const remainingKeys = shuffle(Object.keys(ssl)).slice(1)

      CockroachDBAdapter({
        ssl: remainingKeys.reduce((map, key) => ({...map, [key]: ssl[key]}), {})
      })
    }).throw()
    should(() => {
      CockroachDBAdapter({
        ssl: {
          ca: 'xyz',
          cert: 'xyz',
          key: 'xyz'
        }
      })
    }).not.throw()
  })
})

describe('db = CockroachDBAdapter(config)', () => {
  it('db.getEvents() is a function', () => should(CockroachDBAdapter().getEvents).be.a.Function())
  it('db.getEventsByStream() is a function', () => should(CockroachDBAdapter().getEventsByStream).be.a.Function())
  it('db.getEventsByStreamsCategory() is a function', () => should(CockroachDBAdapter().getEventsByStreamsCategory).be.a.Function())
  it('db.appendEvents() is a function', () => should(CockroachDBAdapter().appendEvents).be.a.Function())
})

describe('dbResults = db.getEvents({fromEventId[, limit]})', () => {
  before(() => createEventsTable())
  beforeEach(() => truncateEventsTable().then(() => populateEventsTable()))

  it('is an event emitter', (done) => {
    let db = getAdapter()
    let dbResults = db.getEvents({fromEventId: 0})

    should(dbResults).be.an.instanceOf(EventEmitter)
    dbResults.on('end', () => done())
  })
  it('emits `event` for each event fetched and then emits `end`', (done) => {
    let db = getAdapter()
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
    truncateEventsTable()
    .then(() => {
      let db = getAdapter()
      let dbResults = db.getEvents({fromEventId: 0})
      dbResults.on('event', () => done(new Error()))
      dbResults.on('end', () => done())
    })
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
    let exprectedEvents = events.filter(({id}) => id > splitEvent.id)

    let db = getAdapter()
    let dbResults = db.getEvents({fromEventId: splitEvent.id})

    let fetchedEvents = []
    dbResults.on('event', (event) => fetchedEvents.push(event))
    dbResults.on('end', () => {
      should(fetchedEvents.map(({data}) => data)).eql(exprectedEvents.map(({data}) => data))
      done()
    })
  })
  it('takes in to account `limit` param if provided', (done) => {
    let db = getAdapter()
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
  before(() => createEventsTable())
  beforeEach(() => truncateEventsTable().then(() => populateEventsTable()))

  it('is an event emitter', (done) => {
    let db = getAdapter()
    let dbResults = db.getEventsByStream({stream: streams[0].name, fromVersionNumber: 0})

    should(dbResults).be.an.instanceOf(EventEmitter)
    dbResults.on('end', () => done())
  })
  it('emits `event` for each event fetched and then emits `end`', (done) => {
    let testStream = sample(streams)
    let db = getAdapter()
    let dbResults = db.getEventsByStream({stream: testStream.name, fromVersionNumber: 0})

    let fetchedEvents = []
    dbResults.on('event', (event) => fetchedEvents.push(event))
    dbResults.on('end', () => {
      should(fetchedEvents.length).equal(testStream.version)
      done()
    })
  })
  it('emits just `end` if no events are found', (done) => {
    let db = getAdapter()
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
    let db = getAdapter()
    let dbResults = db.getEventsByStream({stream: testStream.name, fromVersionNumber: 0})

    let fetchedEvents = []
    dbResults.on('event', (event) => fetchedEvents.push(event))
    dbResults.on('end', () => {
      let idList = fetchedEvents.map(({id}) => id)
      let sortedIdList = idList.slice().sort()
      should(idList).eql(sortedIdList)
      done()
    })
  })
  it('emits just events with `versionNumber` > `fromVersionNumber`', (done) => {
    let testStream = sample(streams)
    let streamEvents = events.filter(({stream}) => stream === testStream.name)
    let splitEvent = sample(streamEvents)
    let expectedEvents = streamEvents.filter(({id}) => id > splitEvent.id)

    let db = getAdapter()
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
    let db = getAdapter()
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
  before(() => createEventsTable())
  beforeEach(() => truncateEventsTable().then(() => populateEventsTable()))

  it('is an event emitter', (done) => {
    let db = getAdapter()
    let dbResults = db.getEventsByStreamsCategory({streamsCategory: 'test', fromEventId: 0})

    should(dbResults).be.an.instanceOf(EventEmitter)
    dbResults.on('end', () => done())
  })
  it('emits `event` for each event fetched and then emits `end`', (done) => {
    let testStream = sample(streams)
    let db = getAdapter()
    let dbResults = db.getEventsByStreamsCategory({streamsCategory: testStream.category, fromEventId: 0})

    let fetchedEvents = []
    dbResults.on('event', (event) => fetchedEvents.push(event))
    dbResults.on('end', () => {
      should(fetchedEvents.length).equal(testStream.version)
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
      let idList = fetchedEvents.map(({id}) => id)
      let sortedIdList = idList.slice().sort()
      should(idList).eql(sortedIdList)
      done()
    })
  })
  it('emits just events with `id` > `fromEventId`', (done) => {
    let testStream = sample(streams)
    let streamEvents = events.filter(({stream}) => stream === testStream.name)
    let splitEvent = sample(streamEvents)
    let expectedEvents = streamEvents.filter(({id}) => id > splitEvent.id)

    let db = getAdapter()
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

    let db = getAdapter()
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
  before(() => createEventsTable())
  beforeEach(() => truncateEventsTable().then(() => populateEventsTable()))

  it('is an event emitter', () => {
    let db = getAdapter()
    let dbResults = db.appendEvents({appendRequests: [], transactionId: shortid()})

    should(dbResults).be.an.instanceOf(EventEmitter)
  })
  it('emits `storedEvents` with a list of created events, ordered by id ASC', (done) => {
    let db = getAdapter()
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
  it('creates a new stream if writing to a not existent stream with expectedVersionNumber === ANY_VERSION_NUMBER', (done) => {
    let db = getAdapter()
    let transactionId = shortid()

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
      getDbStreams().then((streams) => {
        should(storedEvents).containDeepOrdered([
          {
            stream: 'notExistent',
            type: 'aType',
            data: ''
          }
        ])
        should(streams.indexOf('notExistent') >= 0).be.True()
        done()
      })
    })
  })
  it('saves events for multiple streams whithin the same transaction', (done) => {
    let db = getAdapter()
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

    dbResults.on('error', done)
    dbResults.on('storedEvents', (storedEvents) => {
      let transactions = uniq(storedEvents.map(({transactionId}) => transactionId))
      should(transactions.length).equal(1)
      should(transactions[0]).equal(transactionId)
      done()
    })
  })
  it('DOES NOT write any event if the writing to any stream fails', (done) => {
    getEventsCount()
    .then(totalEvents => {
      let db = getAdapter()
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
        getEventsCount()
        .then(newTotalEvents => {
          should(newTotalEvents).equal(totalEvents)
          done()
        })
      })
      dbResults.on('storedEvents', () => done(new Error('should not emit stored events')))
    })
  })
})
