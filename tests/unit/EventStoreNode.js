import grpc from 'grpc'
import should from 'should/as-function'
import EventEmitter from 'eventemitter3'

import { DbAdapter } from '../Mocks'

const libFolder = `../../${process.env.LIB_FOLDER}`
const EventStoreNode = require(`${libFolder}/EventStoreNode`).default

describe('EventStoreNode(config)', () => {
  it('is a function', () => should(EventStoreNode).be.a.Function())
  it('throws if config.dbAdapter is falsy', () => {
    should(() => {
      EventStoreNode({})
    }).throw(new RegExp('you MUST provide a dbAdapter to the EventStoreNode constructor'))
  })
  it('throws if config.dbAdapter does not provide the expected interface', () => {
    should(() => {
      EventStoreNode({dbAdapter: {}})
    }).throw(new RegExp('config.dbAdapter does not provide the expected interface'))

    should(() => {
      EventStoreNode({dbAdapter: DbAdapter()})
    }).not.throw()
  })
  it('throws if config.port is not a positive integer', () => {
    should(() => {
      EventStoreNode({
        port: 0,
        dbAdapter: DbAdapter()
      })
    }).throw(new RegExp('config.port MUST be a positive integer'))

    should(() => {
      EventStoreNode({
        port: 1,
        dbAdapter: DbAdapter()
      })
    }).not.throw()
  })
  it('throws if config.credentials is not an instance of grpc.ServerCredentials', () => {
    should(() => {
      EventStoreNode({
        dbAdapter: DbAdapter(),
        credentials: {}
      })
    }).throw(new RegExp('config.credentials MUST be a valid grpc server credentials object'))

    should(() => {
      EventStoreNode({
        dbAdapter: DbAdapter(),
        credentials: grpc.ServerCredentials.createInsecure()
      })
    }).not.throw()
  })
  it('throws if config.storeBus does not provide the expected interface', () => {
    should(() => {
      EventStoreNode({
        dbAdapter: DbAdapter(),
        storeBus: {}
      })
    }).throw(new RegExp('the provided config.storeBus does not have the expected interface'))
  })
  it('throws if config.writableStreamsPatterns is truthy and is not an array of 0 or more strings', () => {
    let errRegex = new RegExp('config.writableStreamsPatterns MUST be either falsy or an array of 0 or more strings')

    should(() => {
      EventStoreNode({
        dbAdapter: DbAdapter(),
        writableStreamsPatterns: {}
      })
    }).throw(errRegex)

    should(() => {
      EventStoreNode({
        dbAdapter: DbAdapter(),
        writableStreamsPatterns: [1, 'test']
      })
    }).throw(errRegex)

    should(() => {
      EventStoreNode({
        dbAdapter: DbAdapter(),
        writableStreamsPatterns: ['one', 'test']
      })
    }).not.throw()
  })
  describe('node = EventStoreNode(config)', () => {
    it('node is an event emitter', () => {
      let node = EventStoreNode({dbAdapter: DbAdapter()})
      should(node).be.an.instanceOf(EventEmitter)
    })
    it('node.start() is a function', () => {
      let node = EventStoreNode({dbAdapter: DbAdapter()})
      should(node.start).be.a.Function()
    })
    it('node.stop() is a function', () => {
      let node = EventStoreNode({dbAdapter: DbAdapter()})
      should(node.stop).be.a.Function()
    })
    it('node.server is a getter for the internal grpc server instance (null if node is stopped)', (done) => {
      let node = EventStoreNode({dbAdapter: DbAdapter()})

      should(Object.getOwnPropertyDescriptor(node, 'server').get).be.a.Function()

      node.once('start', () => {
        should(node.server).be.an.instanceOf(grpc.Server)
        node.stop()
      })
      node.once('stop', () => {
        should(node.server).be.Null()
        done()
      })
      node.start()
    })
    it('node emits `start` and `stop` events', (done) => {
      let node = EventStoreNode({dbAdapter: DbAdapter()})
      node.once('start', () => setTimeout(() => node.stop(), 30))
      node.once('stop', () => done())
      node.start()
    })
  })
})
