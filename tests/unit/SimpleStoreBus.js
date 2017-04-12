import should from 'should/as-function'
import EventEmitter from 'eventemitter3'

const libFolder = `../../${process.env.LIB_FOLDER}`
const SimpleStoreBus = require(`${libFolder}/SimpleStoreBus`).default

describe('SimpleStoreBus()', () => {
  it('is a function', () => should(SimpleStoreBus).be.a.Function())
  describe('bus = SimpleStoreBus()', () => {
    it('bus is an EventEmitter', () => {
      let bus = SimpleStoreBus()
      should(bus).be.an.instanceOf(EventEmitter)
    })
    it('bus.safeOrderTimeframe === null', () => {
      let bus = SimpleStoreBus()
      should(bus.safeOrderTimeframe).be.Null()
    })
    it('bus.publish(eventsString) is a function', () => {
      let bus = SimpleStoreBus()
      should(bus.publish).be.a.Function()
    })
    it('bus emits `newEvents` whenever bus.publish(eventsString) is invoked, passing `eventsString` as payload', (done) => {
      let bus = SimpleStoreBus()
      let eventsString = JSON.stringify([1, 2, 3])

      bus.once('newEvents', (payload) => {
        should(payload).equal(eventsString)
        done()
      })
      bus.publish(eventsString)
    })
  })
})
