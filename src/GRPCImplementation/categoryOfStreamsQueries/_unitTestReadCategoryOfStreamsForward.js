import should from 'should/as-function'
import { random, max, sample } from 'lodash'

import GRPCImplementation from '..'

describe('.readCategoryOfStreamsForward(call)', () => {
  it('emits `error` on call if call.request.streamsCategory is not a valid string', () => {
    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    // No streamsCategory
    simulation.call.request = {
      streamsCategory: '',
      fromEventId: 0
    }
    implementation.readCategoryOfStreamsForward(simulation.call)
    let emitArgs = simulation.call.emit.firstCall.args

    should(simulation.call.emit.calledOnce).be.True()
    should(emitArgs[0]).equal('error')
    should(emitArgs[1]).be.an.instanceof(Error)
  })
  it('invokes backend.getEventsByStreamCategory() with right parameters', () => {
    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    simulation.call.request = {
      streamsCategory: 'StreamX',
      fromEventId: random(-10, 10),
      limit: random(-10, 10)
    }

    implementation.readCategoryOfStreamsForward(simulation.call)

    let calls = simulation.backend.getEventsByStreamCategory.getCalls()
    should(calls.length === 1).be.True()
    should(calls[0].args[0].streamsCategory).equal(simulation.call.request.streamsCategory)
    should(calls[0].args[0].fromEventId).equal(max([0, simulation.call.request.fromEventId]))
    should(calls[0].args[0].limit).equal(
      simulation.call.request.limit < 1 ? undefined : simulation.call.request.limit
    )
  })
  it('invokes call.write() for every fetched event, in the right sequence', (done) => {
    let testCategory = sample(STREAMS_CATEGORIES.toJS())
    let storedEvents = data.events.filter(event => event.get('stream').split('-')[0] === testCategory)
    let fromEventId = storedEvents.get(random(0, storedEvents.size - 1)).get('id')
    storedEvents = storedEvents.filter(event => event.get('id') > fromEventId)

    let limit = random(storedEvents.size)
    if (limit) storedEvents = storedEvents.slice(0, limit)

    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    simulation.call.request = {
      streamsCategory: testCategory,
      fromEventId,
      limit
    }
    implementation.readCategoryOfStreamsForward(simulation.call)

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
    let testCategory = sample(STREAMS_CATEGORIES.toJS())
    let storedEvents = data.events.filter(event => event.get('stream').split('-')[0] === testCategory)
    let fromEventId = storedEvents.get(random(0, storedEvents.size - 1)).get('id')
    storedEvents = storedEvents.filter(event => event.get('id') > fromEventId)

    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    simulation.call.request = {
      streamsCategory: testCategory,
      fromEventId
    }
    implementation.readCategoryOfStreamsForward(simulation.call)

    setTimeout(() => {
      should(simulation.call.end.calledOnce).be.True()
      done()
    }, 100 + storedEvents.size * 5)
  })
})
