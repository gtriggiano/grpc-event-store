import should from 'should/as-function'
import { random, max } from 'lodash'

import GRPCImplementation from '..'

describe('.readStoreStreamForwardFromEvent(call)', () => {
  it('invokes backend.getEvents() with right parameters', () => {
    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    simulation.call.request = {
      fromEventId: random(-10, 10),
      limit: random(-10, 10)
    }

    implementation.readStoreStreamForwardFromEvent(simulation.call)

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
    let simulation = InMemorySimulation(data)
    let fromEventId = random(data.events.size)
    let storedEvents = data.events.filter(evt => evt.get('id') > fromEventId)
    let limit = random(storedEvents.size)
    if (limit) storedEvents = storedEvents.slice(0, limit)

    let implementation = GRPCImplementation(simulation)

    simulation.call.request = {
      fromEventId,
      limit
    }

    implementation.readStoreStreamForwardFromEvent(simulation.call)

    setTimeout(() => {
      let writeCalls = simulation.call.write.getCalls()
      should(writeCalls.length).equal(storedEvents.size)
      should(writeCalls.map(({args}) => args[0] && args[0].id)).containDeepOrdered(
        storedEvents.toJS().map(({id}) => id)
      )
      done()
    }, storedEvents.size + 10)
  })
  it('invokes call.end() after all the stored events are written', (done) => {
    let simulation = InMemorySimulation(data)
    let fromEventId = random(data.events.size)
    let storedEvents = data.events.filter(evt => evt.get('id') > fromEventId)
    let limit = random(storedEvents.size)
    if (limit) storedEvents = storedEvents.slice(0, limit)

    let implementation = GRPCImplementation(simulation)

    simulation.call.request = {
      fromEventId,
      limit
    }

    implementation.readStoreStreamForwardFromEvent(simulation.call)

    setTimeout(() => {
      should(simulation.call.end.calledOnce).be.True()
      done()
    }, storedEvents.size + 10)
  })
  it('stops invoking call.write() if client ends subscription', (done) => {
    let simulation = InMemorySimulation(data)
    let fromEventId = random(data.events.size)
    let storedEvents = data.events.filter(evt => evt.get('id') > fromEventId)
    let limit = random(storedEvents.size)
    if (limit) storedEvents = storedEvents.slice(0, limit)

    let implementation = GRPCImplementation(simulation)

    simulation.call.request = {
      fromEventId,
      limit
    }

    implementation.readStoreStreamForwardFromEvent(simulation.call)
    simulation.call.emit('end')

    setTimeout(() => {
      should(simulation.call.end.calledOnce).be.True()
      should(simulation.call.write.getCalls().length).equal(0)
      done()
    }, storedEvents.size + 10)
  })
})
