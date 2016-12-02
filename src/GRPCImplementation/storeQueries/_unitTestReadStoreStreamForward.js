import should from 'should/as-function'
import { random, max } from 'lodash'

import GRPCImplementation from '..'

describe('.readStoreStreamForward(call)', () => {
  it('invokes backend.getEvents() with right parameters', () => {
    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    simulation.call.request = {
      fromEventId: random(-10, 10),
      limit: random(-10, 10)
    }

    implementation.readStoreStreamForward(simulation.call)

    let calls = simulation.backend.getEvents.getCalls()
    should(calls.length === 1).be.True()
    should(calls[0].args[0].fromEventId).equal(max([0, simulation.call.request.fromEventId]))
    should(calls[0].args[0].limit).equal(
      simulation.call.request.limit < 1
        ? undefined
        : simulation.call.request.limit
    )
  })
  it('invokes call.write() for every fetched event, in the right sequence', (done) => {
    let fromEventId = random(Math.round(data.events.size * 0.8), data.events.size)
    let storedEvents = data.events.filter(event => event.get('id') > fromEventId)

    let limit = random(storedEvents.size)
    if (limit) storedEvents = storedEvents.slice(0, limit)

    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    simulation.call.request = {
      fromEventId,
      limit
    }

    implementation.readStoreStreamForward(simulation.call)

    setTimeout(() => {
      let writeCalls = simulation.call.write.getCalls()
      should(writeCalls.length).equal(storedEvents.size)
      should(writeCalls.map(({args}) => args[0] && args[0].id)).containDeepOrdered(
        storedEvents.toJS().map(({id}) => id)
      )
      done()
    }, 110 + storedEvents.size * 5)
  })
  it('invokes call.end() after all the stored events are written', (done) => {
    let fromEventId = random(Math.round(data.events.size * 0.8), data.events.size)
    let storedEvents = data.events.filter(event => event.get('id') > fromEventId)
    let limit = random(storedEvents.size)
    if (limit) storedEvents = storedEvents.slice(0, limit)

    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    simulation.call.request = {
      fromEventId,
      limit
    }

    implementation.readStoreStreamForward(simulation.call)

    setTimeout(() => {
      should(simulation.call.end.calledOnce).be.True()
      done()
    }, 110 + storedEvents.size * 5)
  })
})
