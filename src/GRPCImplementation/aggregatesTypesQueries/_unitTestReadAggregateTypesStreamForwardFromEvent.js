import should from 'should/as-function'
import { random, max, sampleSize } from 'lodash'

import GRPCImplementation from '..'

describe('.readAggregateTypesStreamForwardFromEvent(call)', () => {
  it('emits `error` on call if call.request.aggregateTypes is not a valid list of strings', () => {
    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    // No aggregateTypes
    simulation.call.request = {
      aggregateTypes: [],
      fromEventId: 0
    }
    implementation.readAggregateTypesStreamForwardFromEvent(simulation.call)
    let emitArgs = simulation.call.emit.firstCall.args

    should(simulation.call.emit.calledOnce).be.True()
    should(emitArgs[0]).equal('error')
    should(emitArgs[1]).be.an.instanceof(Error)

    // Bad aggregateTypes
    simulation = InMemorySimulation(data)
    simulation.call.request = {
      aggregateTypes: [''],
      fromEventId: 0
    }
    implementation.readAggregateTypesStreamForwardFromEvent(simulation.call)
    emitArgs = simulation.call.emit.firstCall.args

    should(simulation.call.emit.calledOnce).be.True()
    should(emitArgs[0]).equal('error')
    should(emitArgs[1]).be.an.instanceof(Error)
  })
  it('invokes backend.getEventsByAggregateTypes() with right parameters', () => {
    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    simulation.call.request = {
      aggregateTypes: ['typeOne', 'typeTwo'],
      fromEventId: random(-10, 10),
      limit: random(-10, 10)
    }

    implementation.readAggregateTypesStreamForwardFromEvent(simulation.call)

    let calls = simulation.backend.getEventsByAggregateTypes.getCalls()
    should(calls.length === 1).be.True()
    should(calls[0].args[0].aggregateTypes).containDeepOrdered(simulation.call.request.aggregateTypes)
    should(calls[0].args[0].fromEventId).equal(max([0, simulation.call.request.fromEventId]))
    should(calls[0].args[0].limit).equal(
      simulation.call.request.limit < 1 ? undefined : simulation.call.request.limit
    )
  })
  it('invokes call.write() for every fetched event, in the right sequence', (done) => {
    let testAggregateTypes = sampleSize(AGGREGATE_TYPES.toJS(), 2)
    let simulation = InMemorySimulation(data)
    let storedEvents = data.events.filter(evt =>
      !!~testAggregateTypes.indexOf(evt.get('aggregateType'))
    )
    let fromEventId = random(Math.round(storedEvents.size * 0.7) + 1, storedEvents.size)
    storedEvents = storedEvents.filter(evt => evt.get('id') > fromEventId)
    let limit = random(storedEvents.size)
    if (limit) storedEvents = storedEvents.slice(0, limit)

    let implementation = GRPCImplementation(simulation)

    simulation.call.request = {
      aggregateTypes: testAggregateTypes,
      fromEventId,
      limit
    }
    implementation.readAggregateTypesStreamForwardFromEvent(simulation.call)

    setTimeout(() => {
      let writeCalls = simulation.call.write.getCalls()
      should(writeCalls.length).equal(storedEvents.size)
      should(writeCalls.map(({args}) => args[0] && args[0].id)).containDeepOrdered(
        storedEvents.toJS().map(({id}) => id)
      )
      done()
    }, 100 + storedEvents.size * 5)
  })
  it('invokes call.end() after all the stored events are written', (done) => {
    let testAggregateTypes = sampleSize(AGGREGATE_TYPES.toJS(), 2)
    let simulation = InMemorySimulation(data)
    let storedEvents = data.events.filter(evt =>
      !!~testAggregateTypes.indexOf(evt.get('aggregateType'))
    )
    let fromEventId = random(Math.round(storedEvents.size * 0.7) + 1, storedEvents.size)
    storedEvents = storedEvents.filter(evt => evt.get('id') > fromEventId)

    let implementation = GRPCImplementation(simulation)

    simulation.call.request = {
      aggregateTypes: testAggregateTypes,
      fromEventId
    }
    implementation.readAggregateTypesStreamForwardFromEvent(simulation.call)

    setTimeout(() => {
      should(simulation.call.end.calledOnce).be.True()
      done()
    }, 100 + storedEvents.size * 5)
  })
})
