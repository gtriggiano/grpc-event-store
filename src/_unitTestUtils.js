import { range, random } from 'lodash'
import should from 'should/as-function'
import sinon from 'sinon'
import Rx from 'rxjs'
import EventEmitter from 'eventemitter3'
import shortid from 'shortid'

import {
  prefixString,
  timeoutCallback,
  isValidString,
  isValidHostname,
  isPositiveInteger,
  zeropad,
  eventsStreamFromBus,
  eventsStreamFromBackendEmitter
} from './utils'

describe('Utilities', () => {
  describe('prefixString(prefix, str)', () => {
    it('is a function', () => should(prefixString).be.a.Function())
    it('is curried', () => {
      should(prefixString('prefix')).be.a.Function()
    })
    it('returns `{prefix}{str}`', () => {
      should(prefixString('Hello', ' world!')).equal('Hello world!')
    })
  })
  describe('timeoutCallback(timeout, msg, cb)', () => {
    it('is a function', () => should(timeoutCallback).be.a.Function())
    it('is curried', () => {
      should(timeoutCallback(1000)).be.a.Function()
      should(timeoutCallback(1000, 'message')).be.a.Function()
    })
    it('returns a function', () => {
      let timingoutCallback = timeoutCallback(1000, 'timeout!', () => {})
      should(timingoutCallback).be.a.Function()
    })
    it('the returned function, if called within `timeout`, invokes `cb` with the same arguments', () => {
      let cb = (one, two, three) => {
        should(one).equal(1)
        should(two).equal(2)
        should(three).equal(3)
      }

      let tcb = timeoutCallback(1000, 'Timeout!', cb)
      tcb(1, 2, 3)
    })
    it('if the returned function is not called within `timeout`, `cb` is called with `new Error(msg)` as first argument', function (done) {
      let cb = (err) => {
        should(err).be.an.Error()
        should(err.message).equal('Timeout error...')
        done()
      }
      timeoutCallback(300, 'Timeout error...', cb)
    })
    it('`cb` is called only once in any case', function (done) {
      let cb = sinon.spy()
      let cb1 = sinon.spy()

      let tcb = timeoutCallback(50, 'timeout', cb)
      tcb()
      timeoutCallback(50, 'timeout', cb1)

      setTimeout(function () {
        should(cb.callCount).equal(1)
        should(cb1.callCount).equal(1)
        done()
      }, 100)
    })
  })
  describe('isValidString(str)', () => {
    it('is a function', () => should(isValidString).be.a.Function())
    it('returns true if `str` is a string of length > 0, false otherwise', () => {
      should(isValidString('t')).be.True()
      should(isValidString('')).be.False()
      should(isValidString({})).be.False()
      should(isValidString([])).be.False()
      should(isValidString(1)).be.False()
      should(isValidString(() => {})).be.False()
    })
  })
  describe('isValidHostname(str)', () => {
    it('is a function', () => should(isValidHostname).be.a.Function())
    it('returns true if `str` is a valid hostname, false otherwise', () => {
      should(isValidHostname('github')).be.True()
      should(isValidHostname('github.com')).be.True()
      should(isValidHostname('')).be.False()
      should(isValidHostname(2)).be.False()
      should(isValidHostname({})).be.False()
      should(isValidHostname(false)).be.False()
      should(isValidHostname('@github')).be.False()
      should(isValidHostname('@github..com')).be.False()
    })
  })
  describe('isPositiveInteger(n)', () => {
    it('is a function', () => should(isPositiveInteger).be.a.Function())
    it('returns true if `n` is a positive integer, false otherwise', () => {
      should(isPositiveInteger(1)).be.True()
      should(isPositiveInteger(-1)).be.False()
      should(isPositiveInteger(1.3)).be.False()
      should(isPositiveInteger('')).be.False()
      should(isPositiveInteger({})).be.False()
      should(isPositiveInteger([])).be.False()
      should(isPositiveInteger(() => {})).be.False()
    })
  })
  describe('zeropad(i, minLength)', () => {
    it('is a function', () => should(zeropad).be.a.Function())
    it('returns a string', () => should(zeropad(12, 10)).be.a.String())
    it('the returned string has a length >= minLength', () => {
      let i = range(random(8, 15)).join('')
      let minLength = random(5, 20)
      should(zeropad(i, minLength).length >= minLength).be.True()
    })
    it('pads String(i) with zeroes if String(i).length < minLength', () => {
      let str = zeropad('abc', 5)
      should(str).equal('00abc')
    })
  })
  describe('eventsStreamFromBus(busNode[, delayTime = 100])', () => {
    function _fireEventsListsOnBusNode (busNode, eventsLists) {
      Object.keys(eventsLists).forEach(time => {
        setTimeout(function () {
          busNode.emit('StoredEvents', JSON.stringify(eventsLists[time].map(id => ({id}))))
        }, parseInt(time, 10))
      })
    }

    it('is a function', () => should(eventsStreamFromBus).be.a.Function())
    it('returns an instance of Rx.ConnectableObservable', () => {
      let stream = eventsStreamFromBus(FixtureBusNode())
      should(stream).be.an.instanceof(Rx.ConnectableObservable)
    })
    it('delays the output stream by (more or less) `delayTime` ms in respect to the stream of events emitted by `busNode`', function (done) {
      let delayTime = random(120, 160)
      let testBusNode = FixtureBusNode()
      let testStream = eventsStreamFromBus(testBusNode, delayTime)

      let subscription = testStream.subscribe(() => {
        let outputTime = process.hrtime(inputTime)
        let msDiff = outputTime[0] * 1e3 + outputTime[1] / 1e6
        should(msDiff > delayTime).be.True()
        should(msDiff < delayTime + 10).be.True()
        subscription.unsubscribe()
        done()
      })
      let evt = {id: 1}
      let inputTime = process.hrtime()
      testBusNode.emit('StoredEvents', JSON.stringify([evt]))
    })
    it('ensures the right order of events emitted by `bus` within `delayTime`, ordering by event.id', function (done) {
      // timeOfBusEmission: [eventId, ...]
      let sourceEventsLists = {
        0: [1],
        80: [2, 3],
        200: [6, 7],
        210: [4, 5],
        220: [8, 9],
        330: [10]
      }

      let testBusNode = FixtureBusNode()
      let testStream = eventsStreamFromBus(testBusNode)

      let received = []
      let subscription = testStream
        .map(({id}) => id)
        .subscribe(n => {
          received.push(n)
          if (received.length === 10) {
            subscription.unsubscribe()
            should(received).containDeepOrdered([
              1, 2, 3, 4, 5, 6, 7, 8, 9, 10
            ])
            done()
          }
        })

      _fireEventsListsOnBusNode(testBusNode, sourceEventsLists)
    })
  })
  describe('eventsStreamFromBackendEmitter(backendEmitter)', () => {
    it('is a function', () => should(eventsStreamFromBackendEmitter).be.a.Function())
    it('returns an instance of Rx.Observable', () => {
      let backendEmitter = new EventEmitter()
      let stream = eventsStreamFromBackendEmitter(backendEmitter)
      should(stream).be.an.instanceof(Rx.Observable)
    })
    it('dispatches `event` events of `backendEmitter`', (done) => {
      let backendEmitter = new EventEmitter()
      let stream = eventsStreamFromBackendEmitter(backendEmitter)

      let testEvents = range(random(1, 5)).map(() => shortid())
      let eventToEmit = 0
      let dispatchedEvents = []

      let subscription = stream.subscribe(
        (evt) => dispatchedEvents.push(evt),
        (err) => done(err)
      )

      let intval = setInterval(function () {
        let e = testEvents[eventToEmit]
        if (!e) {
          clearInterval(intval)
          subscription.unsubscribe()
          should(dispatchedEvents).containDeepOrdered(testEvents)
          done()
          return
        }
        backendEmitter.emit('event', e)
        eventToEmit++
      }, 10)
    })
    it('returned eventsStream ends with an error if `backendEmitter` emits an `error` event', (done) => {
      let backendEmitter = new EventEmitter()
      let stream = eventsStreamFromBackendEmitter(backendEmitter)
      let dispatchedError = false

      let subscription = stream.subscribe(
        (evt) => done(new Error('should not dispatch enything')),
        (err) => {
          dispatchedError = true
          should(err.message).equal('testMessage')
        },
        () => done(new Error('complete handler should not be executed'))
      )

      setTimeout(function () {
        backendEmitter.emit('error', new Error('testMessage'))
        should(subscription.closed).be.True()
        should(dispatchedError).be.True()
        done()
      }, 20)
    })
    it('returned eventsStream ends if `backendEmitter` emits an `end` event', (done) => {
      let backendEmitter = new EventEmitter()
      let stream = eventsStreamFromBackendEmitter(backendEmitter)

      let subscription = stream.subscribe(
        (evt) => done(new Error('should not dispatch enything')),
        () => done(new Error('error handler should not be executed'))
      )

      setTimeout(function () {
        backendEmitter.emit('end')
        should(subscription.closed).be.True()
        done()
      }, 20)
    })
  })
})
