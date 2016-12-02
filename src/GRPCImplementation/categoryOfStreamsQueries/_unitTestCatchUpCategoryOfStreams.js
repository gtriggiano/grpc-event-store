import should from 'should/as-function'
import { random, max, sample } from 'lodash'

import GRPCImplementation from '..'

describe('.catchUpCategoryOfStreams(call)', () => {
  it('emits `error` on call if call.request.streamsCategory is not a valid string', (done) => {
    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    // No streamsCategory
    let request = {
      streamsCategory: '',
      fromEventId: 0
    }
    implementation.catchUpCategoryOfStreams(simulation.call)
    simulation.call.emit('data', request)

    process.nextTick(() => {
      let emitArgs = simulation.call.emit.secondCall.args

      should(simulation.call.emit.calledTwice).be.True()
      should(emitArgs[0]).equal('error')
      should(emitArgs[1]).be.an.instanceof(Error)

      done()
    })
  })
  it('invokes backend.getEventsByStreamCategory() with right parameters', (done) => {
    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    let request = {
      streamsCategory: 'Streams0',
      fromEventId: random(-10, 10)
    }
    implementation.catchUpCategoryOfStreams(simulation.call)
    simulation.call.emit('data', request)

    process.nextTick(() => {
      let calls = simulation.backend.getEventsByStreamCategory.getCalls()
      should(calls.length === 1).be.True()
      should(calls[0].args[0].streamsCategory).equal(request.streamsCategory)
      should(calls[0].args[0].fromEventId).equal(max([0, request.fromEventId]))
      should(calls[0].args[0].limit).equal(undefined)
      done()
    })
  })
  it('invokes call.write() for every fetched and live event about streams of given category, in the right sequence', (done) => {
    let testCategory = sample(STREAMS_CATEGORIES.toJS())
    let storedEvents = data.events.filter(event => event.get('stream').split('-')[0] === testCategory)
    let fromEventId = storedEvents.get(random(0, storedEvents.size - 1)).get('id')
    storedEvents = storedEvents.filter(event => event.get('id') > fromEventId)

    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    let request = {
      streamsCategory: testCategory,
      fromEventId
    }
    implementation.catchUpCategoryOfStreams(simulation.call)
    simulation.call.emit('data', request)
    simulation.store.publishEvents([
      {id: 100010, stream: `${testCategory}-100`},
      {id: 100011, stream: 'other'},
      {id: 100012, stream: `${testCategory}`}
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
    let testCategory = sample(STREAMS_CATEGORIES.toJS())
    let storedEvents = data.events.filter(event => event.get('stream').split('-')[0] === testCategory)
    let fromEventId = storedEvents.get(random(0, storedEvents.size - 1)).get('id')
    storedEvents = storedEvents.filter(event => event.get('id') > fromEventId)

    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    let request = {
      streamsCategory: testCategory,
      fromEventId
    }
    implementation.catchUpCategoryOfStreams(simulation.call)
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