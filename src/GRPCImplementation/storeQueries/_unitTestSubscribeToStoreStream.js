import should from 'should/as-function'

import GRPCImplementation from '..'

describe.only('.subscribeToStoreStream(call)', () => {
  it('invokes call.write() for every live event', (done) => {
    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    implementation.subscribeToStoreStream(simulation.call)
    simulation.call.emit('data', {})
    simulation.store.publishEvents([
      {id: 100010},
      {id: 100011},
      {id: 100012}
    ])

    setTimeout(() => {
      let writeCalls = simulation.call.write.getCalls()
      should(writeCalls.length).equal(3)
      should(writeCalls.map(({args}) => args[0] && args[0].id)).containDeepOrdered([100010, 100011, 100012])
      simulation.call.emit('end')
      done()
    }, 150)
  })
  it('stops invoking call.write() if client ends subscription', (done) => {
    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    implementation.subscribeToStoreStream(simulation.call)
    simulation.call.emit('data', {})
    simulation.store.publishEvents([
      {id: 100010},
      {id: 100011},
      {id: 100012}
    ])

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
      let calls = simulation.call.write.getCalls()
      should(calls.length).equal(3)
      should(calls.map(({args}) => args[0] && args[0].id)).not.containDeepOrdered([100013, 100014])
      done()
    }, 250)
  })
})
