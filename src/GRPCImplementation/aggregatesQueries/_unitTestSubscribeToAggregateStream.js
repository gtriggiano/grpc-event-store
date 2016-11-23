import should from 'should/as-function'

import GRPCImplementation from '..'

describe('.subscribeToAggregateStream(call)', () => {
  it('emits `error` on call if call.request is not a valid aggregateIdentity', (done) => {
    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    // Bad aggregateIdentity.id
    let request = {id: '', type: 'test'}
    implementation.subscribeToAggregateStream(simulation.call)
    simulation.call.emit('data', request)

    process.nextTick(() => {
      let emitArgs = simulation.call.emit.secondCall.args

      should(simulation.call.emit.calledTwice).be.True()
      should(emitArgs[0]).equal('error')
      should(emitArgs[1]).be.an.instanceof(Error)

      // Bad aggregateIdentity.type
      simulation = InMemorySimulation(data)
      request = {id: 'test', type: ''}
      implementation.subscribeToAggregateStream(simulation.call)
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
  it('invokes call.write() with every live event about aggregate', (done) => {
    let aggregateIdentity = {id: 'uid', type: 'Test'}
    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    let request = aggregateIdentity
    implementation.subscribeToAggregateStream(simulation.call)
    simulation.call.emit('data', request)
    simulation.store.publishEvents([
      {id: 100010, aggregateIdentity},
      {id: 100011, aggregateIdentity: {id: 'other', type: 'other'}},
      {id: 100012, aggregateIdentity}
    ])
    setTimeout(() => {
      let writeCalls = simulation.call.write.getCalls()
      should(writeCalls.length).equal(2)
      should(writeCalls.map(({args}) => args[0] && args[0].id)).containDeepOrdered([100010, 100012])
      simulation.call.emit('end')
      done()
    }, 150)
  })
  it('stops invoking call.write() if client ends subscription', (done) => {
    let aggregateIdentity = {id: 'uid', type: 'Test'}
    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    let request = aggregateIdentity
    implementation.subscribeToAggregateStream(simulation.call)
    simulation.call.emit('data', request)
    simulation.store.publishEvents([
      {id: 100010, aggregateIdentity, data: ''},
      {id: 100011, aggregateIdentity, data: ''}
    ])

    setTimeout(() => {
      simulation.store.publishEvents([
        {id: 100012, aggregateIdentity, data: ''},
        {id: 100013, aggregateIdentity, data: ''}
      ])
    }, 150)

    setTimeout(() => {
      simulation.call.emit('end')
    }, 200)

    setTimeout(() => {
      let calls = simulation.call.write.getCalls()
      should(calls.length).equal(2)
      should(calls.map(({args}) => args[0] && args[0].id)).containDeepOrdered([100010, 100011])
      done()
    }, 300)
  })
})
