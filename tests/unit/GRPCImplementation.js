import shortid from 'shortid'
import should from 'should/as-function'
import {
  random,
  sample,
  max
} from 'lodash'

import Mocks from '../Mocks'

const libFolder = `../../${process.env.LIB_FOLDER}`
const Implementation = require(`${libFolder}/GRPCServer/Implementation`).default

describe('GRPC Implementation', () => {
  describe.only('appendEventsToStream(call, callback)', () => {
    it('is a function', () => should(Implementation({}).appendEventsToStream).be.a.Function())
    it('invokes callback(error) if call.request.stream is not a non empty string', () => {
      let {config, args: {call, callback}} = Mocks()
      let impl = Implementation(config)

      call.request = {
        stream: '',
        events: [{type: 'evtType', data: 'data'}]
      }

      impl.appendEventsToStream(call, callback)

      should(callback.calledOnce).be.True()
      should(callback.firstCall.args[0]).be.an.instanceOf(Error)
    })
    it('invokes callback(error) if call.request.events is not a non empty array of valid events to store', () => {
      ;(() => {
        let {config, args: {call, callback}} = Mocks()
        let impl = Implementation(config)

        call.request = {
          stream: 'testStream',
          events: []
        }

        impl.appendEventsToStream(call, callback)

        should(callback.calledOnce).be.True()
        should(callback.firstCall.args[0]).be.an.instanceOf(Error)
      })()

      ;(() => {
        let {config, args: {call, callback}} = Mocks()
        let impl = Implementation(config)

        call.request = {
          stream: 'testStream',
          events: [{type: ''}]
        }

        impl.appendEventsToStream(call, callback)

        should(callback.calledOnce).be.True()
        should(callback.firstCall.args[0]).be.an.instanceOf(Error)
      })()
    })
    it('invokes callback(error) if call.request.stream does not matches any writableStreamsPatterns', () => {
      let {config, args: {call, callback}} = Mocks(['^imwritable'])
      let impl = Implementation(config)

      call.request = {
        stream: 'testStream',
        events: [{type: 'evtType', data: ''}]
      }

      impl.appendEventsToStream(call, callback)

      should(callback.calledOnce).be.True()
      should(callback.firstCall.args[0]).be.an.instanceOf(Error)
      should(callback.firstCall.args[0].message).equal(`stream 'testStream' is not writable`)
    })
    it('invokes db.appendEvents() with right parameters', () => {
      let {config, args: {call, callback}} = Mocks(['^imwritable'])
      let impl = Implementation(config)

      call.request = {
        stream: 'imwritable::test',
        events: [{type: 'evtType', data: ''}],
        expectedVersionNumber: random(-10, 10)
      }

      impl.appendEventsToStream(call, callback)

      should(config.db.appendEvents.calledOnce).be.True()
      should(config.db.appendEvents.firstCall.args[0].transactionId).be.a.String()
      should(config.db.appendEvents.firstCall.args[0].appendRequests).be.an.Array()
      should(config.db.appendEvents.firstCall.args[0].appendRequests.length).equal(1)
      should(config.db.appendEvents.firstCall.args[0].appendRequests[0].stream).equal(call.request.stream)
      should(config.db.appendEvents.firstCall.args[0].appendRequests[0].events).containDeepOrdered(call.request.events)
      should(config.db.appendEvents.firstCall.args[0].appendRequests[0].expectedVersionNumber).equal(call.request.expectedVersionNumber >= -2 ? call.request.expectedVersionNumber : -2)
    })
    it('invokes callback(error) if there is a db error in appending the events', (done) => {
      let {config, args: {call}} = Mocks()
      let impl = Implementation(config)

      let testStream = config.db.streams.find(({version}) => version > 1)

      call.request = {
        stream: testStream.name,
        events: [{type: 'evtType', data: ''}],
        expectedVersionNumber: 1
      }

      impl.appendEventsToStream(call, (err, results) => {
        should(err).be.an.instanceOf(Error)
        should(results).be.undefined()
        done()
      })
    })
    it('invokes callback(null, {events}) if the events are succesfully appended', (done) => {
      let {config, args: {call}} = Mocks()
      let impl = Implementation(config)

      let testStream = config.db.streams.find(({version}) => version > 1)

      call.request = {
        stream: testStream.name,
        events: [{type: 'evtType', data: 'mydata'}],
        expectedVersionNumber: testStream.version
      }

      impl.appendEventsToStream(call, (err, results) => {
        should(err).be.Null()
        should(results).be.an.Object()
        should(results.events).be.an.Array()
        should(results.events.length).equal(1)
        should(results.events).containDeepOrdered([{type: 'evtType', data: 'mydata'}])
        done()
      })
    })
  })
  describe('appendEventsToMultipleStreams(call, callback)', () => {
    it('is a function', () => should(Implementation({}).appendEventsToMultipleStreams).be.a.Function())
    it('invokes callback(error) if !call.request.appendRequests.length', () => {
      let {config, args: {call, callback}} = Mocks()
      let impl = Implementation(config)

      call.request = {
        appendRequests: []
      }

      impl.appendEventsToMultipleStreams(call, callback)

      should(callback.calledOnce).be.True()
      should(callback.firstCall.args[0]).be.an.instanceOf(Error)
    })
    it('invokes callback(error) if anyone of call.request.appendRequests is not a valid appendRequest', () => {
      let {config, args: {call, callback}} = Mocks()
      let impl = Implementation(config)

      call.request = {
        appendRequests: [
          {
            stream: 'valid',
            events: [{type: 'evtType', data: 'data'}],
            expectedVersionNumber: -2
          },
          {
            stream: '',
            events: [{type: 'evtType', data: 'data'}],
            expectedVersionNumber: -2
          }
        ]
      }

      impl.appendEventsToMultipleStreams(call, callback)

      should(callback.calledOnce).be.True()
      should(callback.firstCall.args[0]).be.an.instanceOf(Error)
    })
    it('invokes callback(error) if each appendRequest does not concern a different stream', () => {
      let {config, args: {call, callback}} = Mocks()
      let impl = Implementation(config)

      call.request = {
        appendRequests: [
          {
            stream: 'sameStream',
            events: [{type: 'evtType', data: 'data'}],
            expectedVersionNumber: -2
          },
          {
            stream: 'sameStream',
            events: [{type: 'evtType', data: 'data'}],
            expectedVersionNumber: -2
          }
        ]
      }

      impl.appendEventsToMultipleStreams(call, callback)

      should(callback.calledOnce).be.True()
      should(callback.firstCall.args[0]).be.an.instanceOf(Error)
    })
    it('invokes db.appendEvents() with right parameters', () => {
      let {config, args: {call, callback}} = Mocks()
      let impl = Implementation(config)

      call.request = {
        appendRequests: [
          {
            stream: 'streamA',
            events: [{type: 'evtType', data: 'data'}],
            expectedVersionNumber: -2
          },
          {
            stream: 'streamB',
            events: [{type: 'evtType', data: 'data'}],
            expectedVersionNumber: -1
          }
        ]
      }

      impl.appendEventsToMultipleStreams(call, callback)

      should(config.db.appendEvents.calledOnce).be.True()
      should(config.db.appendEvents.firstCall.args[0].transactionId).be.a.String()
      should(config.db.appendEvents.firstCall.args[0].appendRequests).be.an.Array()
      should(config.db.appendEvents.firstCall.args[0].appendRequests.length).equal(2)
      should(config.db.appendEvents.firstCall.args[0].appendRequests[0].stream).equal(call.request.appendRequests[0].stream)
      should(config.db.appendEvents.firstCall.args[0].appendRequests[0].events).containDeepOrdered(call.request.appendRequests[0].events)
      should(config.db.appendEvents.firstCall.args[0].appendRequests[0].expectedVersionNumber).equal(-2)
      should(config.db.appendEvents.firstCall.args[0].appendRequests[1].stream).equal(call.request.appendRequests[1].stream)
      should(config.db.appendEvents.firstCall.args[0].appendRequests[1].events).containDeepOrdered(call.request.appendRequests[1].events)
      should(config.db.appendEvents.firstCall.args[0].appendRequests[1].expectedVersionNumber).equal(-1)
    })
    it('invokes callback(error) if there is a db error in appending the events', (done) => {
      let {config, args: {call}} = Mocks()
      let impl = Implementation(config)

      call.request = {
        appendRequests: [
          {
            stream: 'aStream',
            events: [{type: 'evtType', data: 'data'}],
            expectedVersionNumber: -1
          }
        ]
      }

      impl.appendEventsToMultipleStreams(call, (err, results) => {
        should(err).be.an.instanceOf(Error)
        should(results).be.undefined()
        done()
      })
    })
    it('invokes callback(null, {events}) if the events are successfully appended', (done) => {
      let {config, args: {call}} = Mocks(['^writable'])
      let impl = Implementation(config)

      call.request = {
        appendRequests: [
          {
            stream: 'writable::1',
            events: [{type: 'evtType', data: 'data'}],
            expectedVersionNumber: -2
          },
          {
            stream: 'writable::2',
            events: [{type: 'evtType', data: 'data'}],
            expectedVersionNumber: -2
          }
        ]
      }

      impl.appendEventsToMultipleStreams(call, (err, results) => {
        should(err).be.Null()
        should(results).be.an.Object()
        should(results.events).be.an.Array()
        should(results.events).containDeepOrdered([
          {
            type: 'evtType',
            stream: 'writable::1'
          },
          {
            type: 'evtType',
            stream: 'writable::2'
          }
        ])
        done()
      })
    })
  })
  describe('catchUpWithStore(call)', () => {
    it('is a function', () => should(Implementation({}).catchUpWithStore).be.a.Function())
    it('invokes db.getEvents() with right parameters', (done) => {
      let {config, args: {call}} = Mocks()
      let impl = Implementation(config)

      impl.catchUpWithStore(call)
      call.emit('data', {fromEventId: 0})

      process.nextTick(() => {
        should(config.db.getEvents.calledOnce).be.True()
        should(config.db.getEvents.firstCall.args[0].fromEventId).equal(0)
        done()
      })
    })
    it('invokes call.write() for every fetched and live event, in the right sequence', (done) => {
      let {config, args: {call}} = Mocks()
      let impl = Implementation(config)
      impl.catchUpWithStore(call)

      let fromEventId = config.db.events.slice(-3)[0].id
      let storedEvents = config.db.events.slice(-2)
      let newEvents = [
        {id: 10001},
        {id: 10002},
        {id: 10003}
      ]

      call.emit('data', {fromEventId})
      config.onEventsStored(newEvents)

      setTimeout(() => {
        should(call.write.getCalls().length).equal(storedEvents.length + 3)
        should(call.write.getCalls().map(({args}) => args[0])).containDeepOrdered(newEvents)
        call.emit('end')
        done()
      }, storedEvents.length + 10)
    })
    it('stops invoking call.write() if client ends subscription', (done) => {
      let {config, args: {call}} = Mocks()
      let impl = Implementation(config)
      impl.catchUpWithStore(call)

      let fromEventId = config.db.events.slice(-10)[0].id
      let storedEvents = config.db.events.slice(-9)

      call.emit('data', {fromEventId})

      // Events from mock db are emitted every ~1 ms
      setTimeout(() => {
        call.emit('end')
      }, storedEvents.length / 2)
      setTimeout(() => {
        should(call.write.getCalls().length > 0).be.True()
        should(call.write.getCalls().length < 9).be.True()
        done()
      }, storedEvents.length * 2)
    })
  })
  describe('catchUpWithStream(call)', () => {
    it('is a function', () => should(Implementation({}).catchUpWithStream).be.a.Function())
    it('emits `error` on call if requested stream is not a non empty string', (done) => {
      let {config, args: {call}} = Mocks()
      let impl = Implementation(config)
      impl.catchUpWithStream(call)

      call.emit('data', {stream: ''})

      process.nextTick(() => {
        should(call.emit.calledTwice).be.True()
        should(call.emit.secondCall.args[0]).equal('error')
        should(call.emit.secondCall.args[1]).be.an.instanceOf(Error)
        done()
      })
    })
    it('invokes db.getEventsByStream() with right parameters', (done) => {
      let {config, args: {call}} = Mocks()
      let impl = Implementation(config)
      impl.catchUpWithStream(call)

      let callData = {stream: 'testStream', fromVersionNumber: random(-10, 10)}
      call.emit('data', callData)

      process.nextTick(() => {
        should(config.db.getEventsByStream.calledOnce).be.True()
        should(config.db.getEventsByStream.firstCall.args[0].stream).equal(callData.stream)
        should(config.db.getEventsByStream.firstCall.args[0].fromVersionNumber).equal(max([0, callData.fromVersionNumber]))
        should(config.db.getEventsByStream.firstCall.args[0].limit).equal(undefined)
        done()
      })
    })
    it('invokes call.write() for every fetched and live event of the stream, in the right sequence', (done) => {
      let {config, args: {call}} = Mocks()
      let impl = Implementation(config)
      impl.catchUpWithStream(call)

      let testStream = sample(config.db.streams)
      let newEvents = [
        {id: 10001, stream: testStream.name, versionNumber: testStream.version + 1},
        {id: 10002, stream: testStream.name, versionNumber: testStream.version + 2},
        {id: 10003, stream: testStream.name, versionNumber: testStream.version + 3}
      ]

      call.emit('data', {stream: testStream.name})
      config.onEventsStored(newEvents)

      setTimeout(() => {
        should(call.write.getCalls().length).equal(testStream.version + 3)
        should(call.write.getCalls().map(({args}) => args[0])).containDeepOrdered(newEvents)
        call.emit('end')
        done()
      }, testStream.version * 2)
    })
    it('stops invoking call.write() if client ends subscription', (done) => {
      let {config, args: {call}} = Mocks()
      let impl = Implementation(config)
      impl.catchUpWithStream(call)

      let testStream = sample(config.db.streams)

      call.emit('data', {stream: testStream.name})

      // Events from mock db are emitted every ~1 ms
      setTimeout(() => {
        call.emit('end')
      }, testStream.version / 2)
      setTimeout(() => {
        should(call.write.getCalls().length > 0).be.True()
        should(call.write.getCalls().length < testStream.version).be.True()
        done()
      }, testStream.version * 2)
    })
  })
  describe('catchUpWithStreamsCategory(call)', () => {
    it('is a function', () => should(Implementation({}).catchUpWithStreamsCategory).be.a.Function())
    it('emits `error` on call if requested streamsCategory is not a non empty string', (done) => {
      let {config, args: {call}} = Mocks()
      let impl = Implementation(config)
      impl.catchUpWithStreamsCategory(call)

      call.emit('data', {streamsCategory: ''})

      process.nextTick(() => {
        should(call.emit.calledTwice).be.True()
        should(call.emit.secondCall.args[0]).equal('error')
        should(call.emit.secondCall.args[1]).be.an.instanceOf(Error)
        done()
      })
    })
    it('invokes db.getEventsByStreamsCategory() with right parameters', (done) => {
      let {config, args: {call}} = Mocks()
      let impl = Implementation(config)
      impl.catchUpWithStreamsCategory(call)

      let callData = {streamsCategory: 'category', fromEventId: random(-10, 10)}
      call.emit('data', callData)

      process.nextTick(() => {
        should(config.db.getEventsByStreamsCategory.calledOnce).be.True()
        should(config.db.getEventsByStreamsCategory.firstCall.args[0].streamsCategory).equal(callData.streamsCategory)
        should(config.db.getEventsByStreamsCategory.firstCall.args[0].fromEventId).equal(max([0, callData.fromEventId]))
        should(config.db.getEventsByStreamsCategory.firstCall.args[0].limit).equal(undefined)
        done()
      })
    })
    it('invokes call.write() for every fetched and live event belonging to a stream of the given category, in the right sequence', (done) => {
      let {config, args: {call}} = Mocks()
      let impl = Implementation(config)
      impl.catchUpWithStreamsCategory(call)

      let testCategory = sample(config.db.streams).category
      let expectedStoredEvents = config.db.events.filter((event) => event.stream.split('::')[0] === testCategory)
      let newEvents = [
        {id: 10001, stream: `${testCategory}::xyz`, versionNumber: 1},
        {id: 10002, stream: `${testCategory}::xyz`, versionNumber: 2},
        {id: 10003, stream: `${testCategory}::xyz`, versionNumber: 3}
      ]

      call.emit('data', {streamsCategory: testCategory})
      config.onEventsStored(newEvents)

      setTimeout(() => {
        should(call.write.getCalls().length).equal(expectedStoredEvents.length + 3)
        should(call.write.getCalls().map(({args}) => args[0])).containDeepOrdered(newEvents)
        call.emit('end')
        done()
      }, expectedStoredEvents.length * 2)
    })
    it('stops invoking call.write() if client ends subscription', (done) => {
      let {config, args: {call}} = Mocks()
      let impl = Implementation(config)
      impl.catchUpWithStreamsCategory(call)

      let testCategory = sample(config.db.streams).category
      let expectedStoredEvents = config.db.events.filter((event) => event.stream.split('::')[0] === testCategory)

      call.emit('data', {streamsCategory: testCategory})

      // Events from mock db are emitted every ~1 ms
      setTimeout(() => {
        call.emit('end')
      }, expectedStoredEvents.length / 2)
      setTimeout(() => {
        should(call.write.getCalls().length > 0).be.True()
        should(call.write.getCalls().length < expectedStoredEvents.length).be.True()
        done()
      }, expectedStoredEvents.length * 2)
    })
  })
  describe('getUniqueId(call, callback)', () => {
    it('is a function', () => should(Implementation({}).getUniqueId).be.a.Function())
    it('calls callback(null, {uniqueId: String})', () => {
      let {config, args: {call, callback}} = Mocks()
      let impl = Implementation(config)
      impl.getUniqueId(call, callback)

      should(callback.callCount).equal(1)
      should(callback.firstCall.args[0]).be.Null()
      should(callback.firstCall.args[1]).be.an.Object()
      should(shortid.isValid(callback.firstCall.args[1].uniqueId)).be.True()
    })
  })
  describe('ping(call, callback)', () => {
    it('is a function', () => should(Implementation({}).ping).be.a.Function())
    it('calls callback(null, {})', () => {
      let {config, args: {call, callback}} = Mocks()
      let impl = Implementation(config)
      impl.ping(call, callback)

      should(callback.callCount).equal(1)
      should(callback.firstCall.args[0]).be.Null()
      should(callback.firstCall.args[1]).be.an.Object()
      should(Object.keys(callback.firstCall.args[1]).length).equal(0)
    })
  })
  describe('readStoreForward(call)', () => {
    it('is a function', () => should(Implementation({}).readStoreForward).be.a.Function())
    it('invokes db.getEvents() with right parameters', () => {
      let {config, args: {call}} = Mocks()
      let impl = Implementation(config)

      call.request = {fromEventId: random(-30, 30), limit: random(-10, 10)}
      impl.readStoreForward(call)

      should(config.db.getEvents.calledOnce).be.True()
      should(config.db.getEvents.firstCall.args[0].fromEventId).equal(max([0, call.request.fromEventId]))
      should(config.db.getEvents.firstCall.args[0].limit).equal(call.request.limit > 0 ? call.request.limit : undefined)
    })
    it('invokes call.write() for every fetched event', (done) => {
      let {config, args: {call}} = Mocks()
      let impl = Implementation(config)

      let expectedStoredEvents = config.db.events.slice(-10)
      call.request = {fromEventId: expectedStoredEvents[0].id - 1}
      impl.readStoreForward(call)

      setTimeout(() => {
        should(call.write.getCalls().length).equal(expectedStoredEvents.length)
        done()
      }, expectedStoredEvents.length * 2)
    })
    it('invokes call.end() after all the stored events are sent via call.write()', (done) => {
      let {config, args: {call}} = Mocks()
      let impl = Implementation(config)

      let expectedStoredEvents = config.db.events.slice(-10)
      call.request = {fromEventId: expectedStoredEvents[0].id - 1}
      impl.readStoreForward(call)

      setTimeout(() => {
        should(call.end.calledOnce).be.True()
        done()
      }, expectedStoredEvents.length * 2)
    })
  })
  describe('readStreamForward(call)', () => {
    it('is a function', () => should(Implementation({}).readStreamForward).be.a.Function())
    it('emits `error` on call if call.request.stream is not a non empty string', () => {
      let {config, args: {call}} = Mocks()
      let impl = Implementation(config)

      call.request = {stream: ''}
      impl.readStreamForward(call)

      should(call.emit.calledOnce).be.True()
      should(call.emit.firstCall.args[0]).equal('error')
      should(call.emit.firstCall.args[1]).be.an.instanceOf(Error)
    })
    it('invokes db.getEventsByStream() with right parameters', () => {
      let {config, args: {call}} = Mocks()
      let impl = Implementation(config)

      call.request = {stream: 'testStream', fromVersionNumber: random(-10, 10), limit: random(-10, 10)}
      impl.readStreamForward(call)

      should(config.db.getEventsByStream.calledOnce).be.True()
      should(config.db.getEventsByStream.firstCall.args[0].stream).equal('testStream')
      should(config.db.getEventsByStream.firstCall.args[0].fromVersionNumber).equal(max([0, call.request.fromVersionNumber]))
      should(config.db.getEventsByStream.firstCall.args[0].limit).equal(call.request.limit > 0 ? call.request.limit : undefined)
    })
    it('invokes call.write() for every fetched event', (done) => {
      let {config, args: {call}} = Mocks()
      let impl = Implementation(config)

      let testStream = sample(config.db.streams)

      call.request = {stream: testStream.name, fromVersionNumber: 0}
      impl.readStreamForward(call)

      setTimeout(() => {
        should(call.write.getCalls().length).equal(testStream.version)
        done()
      }, testStream.version * 2)
    })
    it('invokes call.end() after all the fetched events are sent via call.write()', (done) => {
      let {config, args: {call}} = Mocks()
      let impl = Implementation(config)

      let testStream = sample(config.db.streams)

      call.request = {stream: testStream.name, fromVersionNumber: 0}
      impl.readStreamForward(call)

      setTimeout(() => {
        should(call.write.getCalls().length).equal(testStream.version)
        should(call.end.calledOnce).be.True()
        done()
      }, testStream.version * 2)
    })
  })
  describe('readStreamsCategoryForward(call)', () => {
    it('is a function', () => should(Implementation({}).readStreamsCategoryForward).be.a.Function())
    it('emits `error` on call if call.request.streamsCategory is not a non empty string', () => {
      let {config, args: {call}} = Mocks()
      let impl = Implementation(config)

      call.request = {streamsCategory: ''}
      impl.readStreamsCategoryForward(call)

      should(call.emit.calledOnce).be.True()
      should(call.emit.firstCall.args[0]).equal('error')
      should(call.emit.firstCall.args[1]).be.an.instanceOf(Error)
    })
    it('invokes db.getEventsByStreamsCategory() with right parameters', () => {
      let {config, args: {call}} = Mocks()
      let impl = Implementation(config)

      call.request = {streamsCategory: 'testCategory', fromEventId: random(-10, 10), limit: random(-10, 10)}
      impl.readStreamsCategoryForward(call)

      should(config.db.getEventsByStreamsCategory.calledOnce).be.True()
      should(config.db.getEventsByStreamsCategory.firstCall.args[0].streamsCategory).equal('testCategory')
      should(config.db.getEventsByStreamsCategory.firstCall.args[0].fromEventId).equal(max([0, call.request.fromEventId]))
      should(config.db.getEventsByStreamsCategory.firstCall.args[0].limit).equal(call.request.limit > 0 ? call.request.limit : undefined)
    })
    it('invokes call.write() for every fetched event', (done) => {
      let {config, args: {call}} = Mocks()
      let impl = Implementation(config)

      let testCategory = sample(config.db.streams).category
      let expectedEvents = config.db.events.filter((event) => event.stream.split('::')[0] === testCategory)

      call.request = {streamsCategory: testCategory, fromEventId: 0}
      impl.readStreamsCategoryForward(call)

      setTimeout(() => {
        should(call.write.getCalls().length).equal(expectedEvents.length)
        done()
      }, expectedEvents.length * 2)
    })
    it('invokes call.end() after all the fetched events are sent via call.write()', (done) => {
      let {config, args: {call}} = Mocks()
      let impl = Implementation(config)

      let testCategory = sample(config.db.streams).category
      let expectedEvents = config.db.events.filter((event) => event.stream.split('::')[0] === testCategory)

      call.request = {streamsCategory: testCategory, fromEventId: 0}
      impl.readStreamsCategoryForward(call)

      setTimeout(() => {
        should(call.write.getCalls().length).equal(expectedEvents.length)
        should(call.end.calledOnce).be.True()
        done()
      }, expectedEvents.length * 2)
    })
  })
  describe('subscribeToStore(call)', () => {
    it('is a function', () => should(Implementation({}).subscribeToStore).be.a.Function())
    it('invokes call.write() for every live event', () => {
      let {config, args: {call}} = Mocks()
      let impl = Implementation(config)

      impl.subscribeToStore(call)
      call.emit('data')
      config.onEventsStored([
        {id: 1},
        {id: 2},
        {id: 3}
      ])

      should(call.write.getCalls().length).equal(3)
    })
    it('stops invoking call.write() if client ends subscription', () => {
      let {config, args: {call}} = Mocks()
      let impl = Implementation(config)

      impl.subscribeToStore(call)
      call.emit('data')
      config.onEventsStored([
        {id: 1},
        {id: 2},
        {id: 3}
      ])
      call.emit('end')
      config.onEventsStored([
        {id: 4},
        {id: 5},
        {id: 6}
      ])

      should(call.write.getCalls().length).equal(3)
    })
  })
  describe('subscribeToStream(call)', () => {
    it('is a function', () => should(Implementation({}).subscribeToStream).be.a.Function())
    it('emits `error` on call if requested stream is not a non empty string', (done) => {
      let {config, args: {call}} = Mocks()
      let impl = Implementation(config)

      impl.subscribeToStream(call)

      call.emit('data', {stream: ''})

      process.nextTick(() => {
        should(call.emit.calledTwice).be.True()
        should(call.emit.secondCall.args[0]).equal('error')
        should(call.emit.secondCall.args[1]).be.an.instanceOf(Error)
        done()
      })
    })
    it('invokes call.write() with every live event belonging to stream', (done) => {
      let {config, args: {call}} = Mocks()
      let impl = Implementation(config)

      impl.subscribeToStream(call)

      call.emit('data', {stream: 'testStream'})
      config.onEventsStored([
        {id: 1, stream: 'testStream'},
        {id: 2, stream: 'testStream'},
        {id: 3, stream: 'anotherStream'},
        {id: 4, stream: 'testStream'}
      ])

      process.nextTick(() => {
        should(call.write.getCalls().length).equal(3)
        done()
      })
    })
    it('stops invoking call.write() if client ends subscription', (done) => {
      let {config, args: {call}} = Mocks()
      let impl = Implementation(config)

      impl.subscribeToStream(call)

      call.emit('data', {stream: 'testStream'})

      config.onEventsStored([
        {id: 1, stream: 'testStream'},
        {id: 2, stream: 'testStream'},
        {id: 3, stream: 'anotherStream'},
        {id: 4, stream: 'testStream'}
      ])

      call.emit('end')

      config.onEventsStored([
        {id: 5, stream: 'testStream'},
        {id: 6, stream: 'testStream'}
      ])

      process.nextTick(() => {
        should(call.write.getCalls().length).equal(3)
        done()
      })
    })
  })
  describe('subscribeToStreamsCategory(call)', () => {
    it('is a function', () => should(Implementation({}).subscribeToStreamsCategory).be.a.Function())
    it('emits `error` on call if requested streamsCategory is not a non empty string', (done) => {
      let {config, args: {call}} = Mocks()
      let impl = Implementation(config)

      impl.subscribeToStreamsCategory(call)

      call.emit('data', {streamsCategory: ''})

      process.nextTick(() => {
        should(call.emit.calledTwice).be.True()
        should(call.emit.secondCall.args[0]).equal('error')
        should(call.emit.secondCall.args[1]).be.an.instanceOf(Error)
        done()
      })
    })
    it('invokes call.write() for every live event belonging to a stream of the given category', (done) => {
      let {config, args: {call}} = Mocks()
      let impl = Implementation(config)

      impl.subscribeToStreamsCategory(call)
      call.emit('data', {streamsCategory: 'testCategory'})

      config.onEventsStored([
        {id: 1, stream: 'testCategory::xyz'},
        {id: 2, stream: 'testCategory'},
        {id: 3, stream: 'anotherCategory'},
        {id: 4, stream: 'testCategory::test'}
      ])

      process.nextTick(() => {
        should(call.write.getCalls().length).equal(3)
        done()
      })
    })
    it('stops invoking call.write() if client ends subscription', (done) => {
      let {config, args: {call}} = Mocks()
      let impl = Implementation(config)

      impl.subscribeToStreamsCategory(call)

      call.emit('data', {streamsCategory: 'testStream'})

      config.onEventsStored([
        {id: 1, stream: 'testStream'},
        {id: 2, stream: 'testStream'},
        {id: 3, stream: 'anotherStream'},
        {id: 4, stream: 'testStream'}
      ])

      call.emit('end')

      config.onEventsStored([
        {id: 5, stream: 'testStream'},
        {id: 6, stream: 'testStream'}
      ])

      process.nextTick(() => {
        should(call.write.getCalls().length).equal(3)
        done()
      })
    })
  })
})
