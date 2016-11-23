import should from 'should/as-function'
import { random, max, sample, sampleSize } from 'lodash'

import GRPCImplementation from '..'

describe('.subscribeToEventTypesStreamFromEvent(call)', () => {
  it('emits `error` on call if call.request.eventTypes is not a valid list of strings', (done) => {
    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    // No eventTypes
    let request = {
      eventTypes: [],
      fromEventId: 0
    }
    implementation.subscribeToEventTypesStreamFromEvent(simulation.call)
    simulation.call.emit('data', request)

    process.nextTick(() => {
      let emitArgs = simulation.call.emit.secondCall.args

      should(simulation.call.emit.calledTwice).be.True()
      should(emitArgs[0]).equal('error')
      should(emitArgs[1]).be.an.instanceof(Error)

      // Bad eventTypes
      simulation = InMemorySimulation(data)
      request = {
        eventTypes: [''],
        fromEventId: 0
      }
      implementation.subscribeToEventTypesStreamFromEvent(simulation.call)
      simulation.call.emit('data', request)

      process.nextTick(() => {
        emitArgs = simulation.call.emit.secondCall.args

        should(simulation.call.emit.calledTwice).be.True()
        should(emitArgs[0]).equal('error')
        should(emitArgs[1]).be.an.instanceof(Error)

        done()
      })
    })
  })
  it('invokes backend.getEventsByTypes() with right parameters', (done) => {
    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    let request = {
      eventTypes: ['typeOne', 'typeTwo'],
      fromEventId: random(-10, 10),
      limit: random(-10, 10)
    }
    implementation.subscribeToEventTypesStreamFromEvent(simulation.call)
    simulation.call.emit('data', request)

    process.nextTick(() => {
      let calls = simulation.backend.getEventsByTypes.getCalls()
      should(calls.length === 1).be.True()
      should(calls[0].args[0].eventTypes).containDeepOrdered(request.eventTypes)
      should(calls[0].args[0].fromEventId).equal(max([0, request.fromEventId]))
      should(calls[0].args[0].limit).equal(undefined)
      done()
    })
  })
  it('invokes call.write() for every fetched and live event with type within the given types, in the right sequence', (done) => {
    let testTypes = sampleSize(EVENT_TYPES.toJS(), 2)
    let storedEvents = data.events.filter(evt =>
      !!~testTypes.indexOf(evt.get('type'))
    )

    let fromEventId = random(1, storedEvents.size)
    storedEvents = storedEvents.filter(evt => evt.get('id') > fromEventId)

    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    let request = {
      eventTypes: testTypes,
      fromEventId
    }
    implementation.subscribeToEventTypesStreamFromEvent(simulation.call)
    simulation.call.emit('data', request)
    simulation.store.publishEvents([
      {id: 100010, type: sample(testTypes)},
      {id: 100011, type: 'other'},
      {id: 100012, type: sample(testTypes)}
    ])

    setTimeout(() => {
      let writeCalls = simulation.call.write.getCalls()
      should(writeCalls.length).equal(storedEvents.size + 2)
      should(writeCalls.map(({args}) => args[0] && args[0].id)).containDeepOrdered([100010, 100012])
      done()
    }, 100 + storedEvents.size * 4)
  })
  it('stops invoking call.write() if client ends subscription', (done) => {
    let testTypes = sampleSize(EVENT_TYPES.toJS(), 2)
    let storedEvents = data.events.filter(evt =>
      !!~testTypes.indexOf(evt.get('type'))
    )
    let fromEventId = random(1, storedEvents.size)
    storedEvents = storedEvents.filter(evt => evt.get('id') > fromEventId)

    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    let request = {
      eventTypes: testTypes,
      fromEventId
    }
    implementation.subscribeToEventTypesStreamFromEvent(simulation.call)
    simulation.call.emit('data', request)

    setTimeout(() => {
      simulation.call.emit('end')
    }, 200)

    setTimeout(() => {
      let calls = simulation.call.write.getCalls()
      should(calls.length).be.below(storedEvents.size)
      done()
    }, 100 + storedEvents.size * 4)
  })
})
