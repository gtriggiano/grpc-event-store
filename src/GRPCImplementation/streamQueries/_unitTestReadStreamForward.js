import should from 'should/as-function'
import { random, max } from 'lodash'

import GRPCImplementation from '..'

describe('.readStreamForward(call)', () => {
  it('emits `error` on call if call.request.stream is not a valid string', () => {
    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    // No stream
    simulation.call.request = {
      stream: '',
      fromVersionNumber: 0
    }
    implementation.readStreamForward(simulation.call)
    let emitArgs = simulation.call.emit.firstCall.args

    should(simulation.call.emit.calledOnce).be.True()
    should(emitArgs[0]).equal('error')
    should(emitArgs[1]).be.an.instanceof(Error)
  })
  it('invokes backend.getEventsByStream() with right parameters', () => {
    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    simulation.call.request = {
      stream: 'StreamX',
      fromVersionNumber: random(-10, 10),
      limit: random(-10, 10)
    }

    implementation.readStreamForward(simulation.call)

    let calls = simulation.backend.getEventsByStream.getCalls()
    should(calls.length === 1).be.True()
    should(calls[0].args[0].stream).containEql(simulation.call.request.stream)
    should(calls[0].args[0].fromVersionNumber).equal(max([0, simulation.call.request.fromVersionNumber]))
    should(calls[0].args[0].limit).equal(
      simulation.call.request.limit < 1 ? undefined : simulation.call.request.limit
    )
  })
  it('invokes call.write() for every fetched stream event, in the right sequence', (done) => {
    let testStream = data.streams.get(random(data.streams.size - 1))
    let storedEvents = data.events.filter(event => event.get('stream') === testStream.get('id'))
    let fromVersionNumber = storedEvents.get(random(0, storedEvents.size - 1)).get('versionNumber')
    storedEvents = storedEvents.filter(event => event.get('versionNumber') > fromVersionNumber)

    let limit = random(storedEvents.size)
    if (limit) storedEvents = storedEvents.slice(0, limit)

    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    simulation.call.request = {
      stream: testStream.get('id'),
      fromVersionNumber,
      limit
    }
    implementation.readStreamForward(simulation.call)

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
    let testStream = data.streams.get(random(data.streams.size - 1))
    let storedEvents = data.events.filter(event => event.get('stream') === testStream.get('id'))
    let fromVersionNumber = storedEvents.get(random(0, storedEvents.size - 1)).get('versionNumber')
    storedEvents = storedEvents.filter(event => event.get('versionNumber') > fromVersionNumber)

    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    simulation.call.request = {
      stream: testStream.get('id'),
      fromVersionNumber
    }
    implementation.readStreamForward(simulation.call)

    setTimeout(() => {
      let writeCalls = simulation.call.write.getCalls()
      should(writeCalls.length).equal(storedEvents.size)
      should(simulation.call.end.calledOnce).be.True()
      done()
    }, 140 + storedEvents.size * 5)
  })
})
