import should from 'should/as-function'
import { random, max, sample, sampleSize } from 'lodash'

import GRPCImplementation from '..'

describe.only('.subscribeToAggregateTypesStreamFromEvent(call)', () => {
  it('emits `error` on call if call.request.aggregateTypes is not a valid list of strings', (done) => {
    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    // No aggregateTypes
    let request = {
      aggregateTypes: [],
      fromEventId: 0
    }
    implementation.subscribeToAggregateTypesStreamFromEvent(simulation.call)
    simulation.call.emit('data', request)

    process.nextTick(() => {
      let emitArgs = simulation.call.emit.secondCall.args

      should(simulation.call.emit.calledTwice).be.True()
      should(emitArgs[0]).equal('error')
      should(emitArgs[1]).be.an.instanceof(Error)

      // Bad aggregateTypes
      simulation = InMemorySimulation(data)
      simulation.call.request = {
        aggregateTypes: [''],
        fromEventId: 0
      }
      implementation.subscribeToAggregateTypesStreamFromEvent(simulation.call)
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
  it('invokes backend.getEventsByAggregateTypes() with right parameters', (done) => {
    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    let request = {
      aggregateTypes: ['typeOne', 'typeTwo'],
      fromEventId: random(-10, 10),
      limit: random(-10, 10)
    }
    implementation.subscribeToAggregateTypesStreamFromEvent(simulation.call)
    simulation.call.emit('data', request)

    process.nextTick(() => {
      let calls = simulation.backend.getEventsByAggregateTypes.getCalls()
      should(calls.length === 1).be.True()
      should(calls[0].args[0].aggregateTypes).containDeepOrdered(request.aggregateTypes)
      should(calls[0].args[0].fromEventId).equal(max([0, request.fromEventId]))
      should(calls[0].args[0].limit).equal(undefined)
      done()
    })
  })
  it('invokes call.write() for every fetched and live event about aggregate of given types, in the right sequence', (done) => {
    let testAggregateTypes = sampleSize(AGGREGATE_TYPES.toJS(), 2)
    let storedEvents = data.events.filter(evt =>
      !!~testAggregateTypes.indexOf(evt.get('aggregateType'))
    )
    let fromEventId = random(1, storedEvents.size)
    storedEvents = storedEvents.filter(evt => evt.get('id') > fromEventId)

    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    let request = {
      aggregateTypes: testAggregateTypes,
      fromEventId
    }
    implementation.subscribeToAggregateTypesStreamFromEvent(simulation.call)
    simulation.call.emit('data', request)
    simulation.store.publishEvents([
      {id: 100010, aggregateIdentity: {id: 'anid', type: sample(testAggregateTypes)}},
      {id: 100011, aggregateIdentity: {id: 'other', type: 'other'}},
      {id: 100012, aggregateIdentity: {id: 'anid', type: sample(testAggregateTypes)}}
    ])

    setTimeout(() => {
      let writeCalls = simulation.call.write.getCalls()
      should(writeCalls.length).equal(storedEvents.size + 2)
      should(writeCalls.map(({args}) => args[0] && args[0].id)).containDeepOrdered([100010, 100012])
      simulation.call.emit('end')
      done()
    }, 100 + (storedEvents.size * 5))
  })
  it('stops invoking call.write() if client ends subscription', (done) => {
    let testAggregateTypes = sampleSize(AGGREGATE_TYPES.toJS(), 2)
    let storedEvents = data.events.filter(evt =>
      !!~testAggregateTypes.indexOf(evt.get('aggregateType'))
    )
    let fromEventId = random(1, storedEvents.size)
    storedEvents = storedEvents.filter(evt => evt.get('id') > fromEventId)

    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    let request = {
      aggregateTypes: testAggregateTypes,
      fromEventId
    }
    implementation.subscribeToAggregateTypesStreamFromEvent(simulation.call)
    simulation.call.emit('data', request)

    setTimeout(() => {
      simulation.call.emit('end')
    }, 120)

    setTimeout(() => {
      let calls = simulation.call.write.getCalls()
      should(calls.length).be.below(storedEvents.size)
      done()
    }, 100 + (storedEvents.size * 5))
  })
})
