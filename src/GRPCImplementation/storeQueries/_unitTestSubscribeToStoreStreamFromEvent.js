import should from 'should/as-function'
import { random, max } from 'lodash'

import GRPCImplementation from '..'

describe.only('.subscribeToStoreStreamFromEvent(call)', () => {
  it('invokes backend.getEvents() with right parameters', (done) => {
    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    let request = {
      fromEventId: random(-10, 10),
      limit: random(-10, 10)
    }
    implementation.subscribeToStoreStreamFromEvent(simulation.call)
    simulation.call.emit('data', request)

    process.nextTick(() => {
      let calls = simulation.backend.getEvents.getCalls()
      should(calls.length).equal(1)
      should(calls[0].args[0].fromEventId).equal(max([0, request.fromEventId]))
      should(calls[0].args[0].limit).equal(undefined)
      done()
    })
  })
  it('invokes call.write() for every fetched and live event, in the right sequence', (done) => {
    let fromEventId = data.events.size - 3
    let storedEvents = data.events.filter(evt => evt.get('id') > fromEventId)

    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    implementation.subscribeToStoreStreamFromEvent(simulation.call)
    simulation.call.emit('data', {fromEventId})
    simulation.store.publishEvents([
      {id: 100010},
      {id: 100011},
      {id: 100012}
    ])

    setTimeout(() => {
      let writeCalls = simulation.call.write.getCalls()
      let eventIds = writeCalls.map(({args}) => args[0] && args[0].id)
      should(eventIds.length).equal(storedEvents.size + 3)
      should(eventIds).containDeepOrdered([100010, 100011, 100012])
      simulation.call.emit('end')
      done()
    }, 300)
  })
  it('stops invoking call.write() if client ends subscription', (done) => {
    let fromEventId = data.events.size - 3
    let storedEvents = data.events.filter(evt => evt.get('id') > fromEventId)

    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    implementation.subscribeToStoreStreamFromEvent(simulation.call)
    simulation.call.emit('data', {fromEventId})

    simulation.store.publishEvents([
      {id: 100010},
      {id: 100011},
      {id: 100012}
    ])

    // Published events arrive 100 ms later
    setTimeout(() => {
      simulation.store.publishEvents([
        {id: 100013},
        {id: 100014}
      ])
    }, 150)

    setTimeout(() => {
      simulation.call.emit('end')
    }, 200)

    setTimeout(() => {
      let writeCalls = simulation.call.write.getCalls()
      let eventIds = writeCalls.map(({args}) => args[0] && args[0].id)

      should(eventIds.length).equal(storedEvents.size + 3)
      should(eventIds).containDeepOrdered([100010, 100011, 100012])
      should(eventIds).not.containDeepOrdered([100013, 100014])
      done()
    }, 400)
  })
})
