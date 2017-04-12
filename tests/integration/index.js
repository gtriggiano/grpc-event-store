import grpc from 'grpc'
import should from 'should/as-function'

import {
  range
} from 'lodash'

import {
  createEventsTable,
  truncateEventsTable,
  populateEventsTable
} from '../CockroachDbAdapter/dbTestUtils'

const libFolder = `../../${process.env.LIB_FOLDER}`

const lib = require(`${libFolder}`)
const {
  getProtocol,
  ANY_VERSION_NUMBER
} = lib

const getClient = () => {
  let protocol = getProtocol()
  return new protocol.EventStore('testServer:50051', grpc.credentials.createInsecure())
}

describe('client.ping({})', () => {
  it('gets back an empty DTO as unary response', (done) => {
    let client = getClient()
    client.ping({}, (err, result) => {
      should(err).be.Null()
      should(result).be.an.Object()
      should(Object.keys(result).length).equal(0)
      done()
    })
  })
})
describe('client.getUniqueId({})', () => {
  it('gets back an {uniqueId: String} object as unary response', (done) => {
    let client = getClient()
    client.getUniqueId({}, (err, result) => {
      should(err).be.Null()
      should(result.uniqueId).be.a.String()
      done()
    })
  })
})
describe('client.appendEventsToStream({stream: String, expectedVersionNumber: Int, events: [{type: String, data: String}, ...]})', () => {
  before(() => createEventsTable())
  beforeEach(() => truncateEventsTable().then(() => populateEventsTable()))

  it('gets back an {events: Array} object as unary response', (done) => {
    let client = getClient()

    client.appendEventsToStream({
      stream: 'testStream',
      events: range(350).map(() => ({
        type: 'FirstFactHappened',
        data: 'a data string'
      })),
      expectedVersionNumber: 0
    }, (err, result) => {
      should(err).be.Null()
      should(result.events).be.an.Array()
      done()
    })
  })
})
