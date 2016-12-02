import should from 'should/as-function'

import GRPCImplementation from '..'

describe('.subscribeToStream(call)', () => {
  it('emits `error` on call if call.request.stream is not a valid string', (done) => {
    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    // No stream
    let request = {stream: ''}
    implementation.subscribeToStream(simulation.call)
    simulation.call.emit('data', request)

    process.nextTick(() => {
      let emitArgs = simulation.call.emit.secondCall.args

      should(simulation.call.emit.calledTwice).be.True()
      should(emitArgs[0]).equal('error')
      should(emitArgs[1]).be.an.instanceof(Error)
      done()
    })
  })
  it('invokes call.write() with every live event about stream', (done) => {
    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    let request = {stream: 'StreamX'}
    implementation.subscribeToStream(simulation.call)
    simulation.call.emit('data', request)
    simulation.store.publishEvents([
      {id: 100010, stream: 'StreamX'},
      {id: 100011, stream: 'Other'},
      {id: 100012, stream: 'StreamX'}
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
    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    let request = {stream: 'StreamX'}
    implementation.subscribeToStream(simulation.call)
    simulation.call.emit('data', request)
    simulation.store.publishEvents([
      {id: 100010, stream: 'StreamX'},
      {id: 100011, stream: 'StreamX'}
    ])

    setTimeout(() => {
      simulation.store.publishEvents([
        {id: 100012, stream: 'StreamX'},
        {id: 100013, stream: 'StreamX'}
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
