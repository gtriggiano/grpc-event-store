import should from 'should/as-function'
import { sample } from 'lodash'

import GRPCImplementation from '..'

describe('.subscribeToCategoryOfStreams(call)', () => {
  it('emits `error` on call if call.request.streamsCategory is not a valid string', (done) => {
    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    // No streamsCategory
    let request = {
      streamsCategory: ''
    }
    implementation.subscribeToCategoryOfStreams(simulation.call)
    simulation.call.emit('data', request)

    process.nextTick(() => {
      let emitArgs = simulation.call.emit.secondCall.args

      should(simulation.call.emit.calledTwice).be.True()
      should(emitArgs[0]).equal('error')
      should(emitArgs[1]).be.an.instanceof(Error)
      done()
    })
  })
  it('invokes call.write() for every live event about streams of given category', (done) => {
    let testCategory = sample(STREAMS_CATEGORIES.toJS())

    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    let request = {
      streamsCategory: testCategory
    }
    implementation.subscribeToCategoryOfStreams(simulation.call)
    simulation.call.emit('data', request)
    simulation.store.publishEvents([
      {id: 100010, stream: `${testCategory}-100`},
      {id: 100011, stream: 'other'},
      {id: 100012, stream: `${testCategory}`}
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
    let testCategory = sample(STREAMS_CATEGORIES.toJS())

    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    let request = {
      streamsCategory: testCategory
    }
    implementation.subscribeToCategoryOfStreams(simulation.call)
    simulation.call.emit('data', request)
    simulation.store.publishEvents([
      {id: 100010, stream: `${testCategory}-100`},
      {id: 100011, stream: 'other'},
      {id: 100012, stream: `${testCategory}`}
    ])

    setTimeout(() => {
      simulation.store.publishEvents([
        {id: 100013, stream: `${testCategory}-100`},
        {id: 100014, stream: `${testCategory}`}
      ])
    }, 150)

    setTimeout(() => {
      simulation.call.emit('end')
    }, 200)

    setTimeout(() => {
      let calls = simulation.call.write.getCalls()
      let eventIds = calls.map(({args}) => args[0] && args[0].id)
      should(eventIds.length).equal(2)
      should(eventIds).containDeepOrdered([100010, 100012])
      should(eventIds).not.containDeepOrdered([100013, 100014])
      done()
    }, 300)
  })
})
