import grpc from 'grpc'
import Rx from 'rxjs/Rx'
import EventEmitter from 'eventemitter3'
import should from 'should/as-function'
import {
  range,
  random,
  shuffle
} from 'lodash'

import { DbAdapter } from '../Mocks'

const libFolder = `../../${process.env.LIB_FOLDER}`

const {
  prefixedString,
  isPositiveInteger,
  isArrayOfNotEmptyStrings,
  areValidGRPCCredentials,
  hasDbAdapterInterface,
  hasStoreBusInterface,
  stringMatchesSomeRegex,
  zeropad,
  eventsStreamFromDbEmitter,
  eventsStreamFromStoreBus,
  defineError
} = require(`${libFolder}/utils`)
const SimpleStoreBus = require(`${libFolder}/SimpleStoreBus`).default

describe('utils', () => {
  describe('prefixedString(prefix, str)', () => {
    it('is a function', () => should(prefixedString).be.a.Function())
    it('is curried', () => {
      should(prefixedString('prefix')).be.a.Function()
    })
    it('returns \'prefix + string\'', () => {
      should(prefixedString('Hello', 'world!')).equal('Helloworld!')
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
  describe('isArrayOfNotEmptyStrings(list)', () => {
    it('is a function', () => should(isArrayOfNotEmptyStrings).be.a.Function())
    it('returns true if `list` is an array of 0 or more strings having length > 0, false otherwise', () => {
      should(isArrayOfNotEmptyStrings([])).be.True()
      should(isArrayOfNotEmptyStrings(['string'])).be.True()
      should(isArrayOfNotEmptyStrings('')).be.False()
      should(isArrayOfNotEmptyStrings({})).be.False()
      should(isArrayOfNotEmptyStrings([1])).be.False()
      should(isArrayOfNotEmptyStrings(1)).be.False()
      should(isArrayOfNotEmptyStrings(() => {})).be.False()
    })
  })
  describe('areValidGRPCCredentials(credentials)', () => {
    it('is a function', () => should(areValidGRPCCredentials).be.a.Function())
    it('returns true if `credentials` is an instance of grpc.ServerCredentials', () => {
      should(areValidGRPCCredentials({})).be.False()
      should(areValidGRPCCredentials([])).be.False()
      should(areValidGRPCCredentials(grpc.ServerCredentials.createInsecure())).be.True()
    })
  })
  describe('hasDbAdapterInterface(obj)', () => {
    it('is a function', () => should(hasDbAdapterInterface).be.a.Function())
    it('tests if object has a dbAdapter interface', () => {
      let goodObj = DbAdapter()
      let badObj = shuffle(Object.keys(goodObj)).slice(1).reduce((o, k) => {
        o[k] = goodObj[k]
        return o
      }, {})
      should(hasDbAdapterInterface(goodObj)).be.True()
      should(hasDbAdapterInterface(badObj)).be.False()
    })
  })
  describe('hasStoreBusInterface(obj)', () => {
    it('is a function', () => should(hasStoreBusInterface).be.a.Function())
    it('tests if object has a storeBus interface', () => {
      let goodObj = SimpleStoreBus()
      let badObj = shuffle(Object.keys(goodObj)).slice(1).reduce((o, k) => {
        o[k] = goodObj[k]
        return o
      }, {})
      let badObj2 = Object.assign({}, badObj, {safeTimeframe: 'x'})
      should(hasStoreBusInterface(goodObj)).be.True()
      should(hasStoreBusInterface(badObj)).be.False()
      should(hasStoreBusInterface(badObj2)).be.False()
    })
  })
  describe('stringMatchesSomeRegex(regexList, str)', () => {
    it('is a function', () => should(stringMatchesSomeRegex).be.a.Function())
    it('is curried', () => should(stringMatchesSomeRegex(null)).be.a.Function())
    it('returns true if regexList is falsy or an empty array', () => {
      should(stringMatchesSomeRegex(null, 'test')).be.True()
      should(stringMatchesSomeRegex([], 'test')).be.True()
    })
    it('returns true if str matches any of the regex', () => {
      let regexList = [
        new RegExp('^test'),
        new RegExp('world$')
      ]
      let matches = stringMatchesSomeRegex(regexList)
      should(matches('test string')).be.True()
      should(matches('hello world')).be.True()
    })
    it('returns false if str does not matches any of the regex', () => {
      let regexList = [
        new RegExp('^test'),
        new RegExp('world$')
      ]
      let matches = stringMatchesSomeRegex(regexList)
      should(matches('world is big')).be.False()
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
  describe('eventsStreamFromDbEmitter(dbEmitter)', () => {
    it('is a function', () => should(eventsStreamFromDbEmitter).be.a.Function())
    describe('eventsStream = eventsStreamFromDbEmitter(dbEmitter)', () => {
      it('is an instance of Rx.Observable', () => {
        let dbEmitter = new EventEmitter()
        let stream = eventsStreamFromDbEmitter(dbEmitter)
        should(stream).be.an.instanceof(Rx.Observable)
      })
      it('dispatches `event` events of `dbEmitter`', (done) => {
        let dbEmitter = new EventEmitter()
        let eventsStream = eventsStreamFromDbEmitter(dbEmitter)

        let testEvents = range(random(1, 10)).map(n => n + 10)
        let eventToEmit = 0
        let dispatchedEvents = []

        let subscription = eventsStream.subscribe(
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
          dbEmitter.emit('event', e)
          eventToEmit++
        }, 5)
      })
      it('ends with an error if `dbEmitter` emits an `error` event', (done) => {
        let dbEmitter = new EventEmitter()
        let eventsStream = eventsStreamFromDbEmitter(dbEmitter)
        let dispatchedError = false

        let subscription = eventsStream.subscribe(
          (evt) => done(new Error('should not dispatch anything')),
          (err) => {
            dispatchedError = true
            should(err.message).equal('testMessage')
          },
          () => done(new Error('complete handler should not be executed'))
        )

        setTimeout(function () {
          dbEmitter.emit('error', new Error('testMessage'))
          should(subscription.closed).be.True()
          should(dispatchedError).be.True()
          done()
        }, 20)
      })
      it('ends if `dbEmitter` emits an `end` event', (done) => {
        let dbEmitter = new EventEmitter()
        let eventsStream = eventsStreamFromDbEmitter(dbEmitter)

        let subscription = eventsStream.subscribe(
          (evt) => done(new Error('should not dispatch enything')),
          () => done(new Error('error handler should not be executed'))
        )

        setTimeout(function () {
          dbEmitter.emit('end')
          should(subscription.closed).be.True()
          done()
        }, 20)
      })
    })
  })
  describe('eventsStreamFromStoreBus(storeBus)', () => {
    it('is a function', () => should(eventsStreamFromStoreBus).be.a.Function())
    describe('eventsStream = eventsStreamFromStoreBus(storeBus)', () => {
      it('is an instance of Rx.Observable', () => {
        let eventsStream = eventsStreamFromStoreBus(SimpleStoreBus())
        should(eventsStream).be.an.instanceof(Rx.Observable)
      })
      it('by default synchronously streams the events emitted by storeBus', (done) => {
        let storeBus = SimpleStoreBus()
        let eventsStream = eventsStreamFromStoreBus(storeBus)

        let events = range(random(2, 5)).map(n => ({id: n + 1}))

        let count = 1
        let subscription = eventsStream.subscribe(event => {
          should(event.id).equal(count)
          if (count === events.length) {
            subscription.unsubscribe()
            done()
          } else {
            count++
          }
        })

        storeBus.emit('newEvents', JSON.stringify(events))
      })
      it('if storeBus.safeOrderTimeframe = n, delays eventsStream by n ms in respect to the stream of events emitted by `storeBus`', (done) => {
        let storeBus = SimpleStoreBus()
        let eventsStream = eventsStreamFromStoreBus(Object.assign(storeBus, {safeOrderTimeframe: random(10, 30)}))

        let subscription = eventsStream.subscribe(() => {
          let outputTime = process.hrtime(inputTime)
          let msDiff = outputTime[0] * 1e3 + outputTime[1] / 1e6
          should(msDiff > storeBus.safeOrderTimeframe).be.True()
          should(msDiff < storeBus.safeOrderTimeframe + 10).be.True()
          subscription.unsubscribe()
          done()
        })
        let event = {id: 1}
        let inputTime = process.hrtime()
        storeBus.emit('newEvents', JSON.stringify([event]))
      })
      it('if storeBus.safeOrderTimeframe = n, ensures the right order of events emitted by `storeBus` within n ms, ordering by event.id', (done) => {
        let eventsLists = {
          0: [1], // timeOfBusEmission: [eventId, ...]
          80: [2, 3],
          200: [6, 7],
          210: [4, 5],
          220: [8, 9],
          330: [10]
        }

        let storeBus = SimpleStoreBus()
        let eventsStream = eventsStreamFromStoreBus(Object.assign(storeBus, {safeOrderTimeframe: 20}))

        let received = []
        let subscription = eventsStream
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

        Object.keys(eventsLists).forEach(time => {
          setTimeout(function () {
            storeBus.emit('newEvents', JSON.stringify(eventsLists[time].map(id => ({id}))))
          }, parseInt(time, 10))
        })
      })
    })
  })
  describe('defineError(errorName, errorMessage)', () => {
    it('is a function', () => should(defineError).be.a.Function())
    describe(`CustomError = defineError(errorName, errorMessage)`, () => {
      it('is a function', () => should(defineError('myerror')).be.a.Function())
      it('CustomError.name === errorName', () => {
        let CustomError = defineError('myerror')
        should(CustomError.name).equal('myerror')
      })
      describe('e = CustomError(\'whatever\')', () => {
        it('is an instance of Error', () => {
          let CustomError = defineError('myerror')
          let e = new CustomError()
          should(e).be.an.instanceOf(Error)
        })
        it('e.message === errorMessage', () => {
          let CustomError = defineError('myerror', 'my error message')
          let e = new CustomError()
          let eDiffMsg = new CustomError('different message')
          should(e.message).equal('my error message')
          should(eDiffMsg.message).equal('my error message')
        })
      })
    })
  })
})
