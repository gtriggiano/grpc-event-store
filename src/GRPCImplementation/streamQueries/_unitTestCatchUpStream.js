import should from 'should/as-function'
import { random, max } from 'lodash'

import GRPCImplementation from '..'

describe('.catchUpStream(call)', () => {
  it('emits `error` on call if call.request.stream is not a valid string', (done) => {
    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    // No stream
    implementation.catchUpStream(simulation.call)
    simulation.call.emit('data', {stream: ''})

    process.nextTick(() => {
      let emitArgs = simulation.call.emit.secondCall.args

      should(simulation.call.emit.calledTwice).be.True()
      should(emitArgs[0]).equal('error')
      should(emitArgs[1]).be.an.instanceof(Error)
      done()
    })
  })
  it('invokes backend.getEventsByStream() with right parameters', (done) => {
    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    let request = {
      stream: 'StreamX',
      fromVersionNumber: random(-10, 10)
    }
    implementation.catchUpStream(simulation.call)
    simulation.call.emit('data', request)

    process.nextTick(() => {
      let calls = simulation.backend.getEventsByStream.getCalls()
      should(calls.length === 1).be.True()
      should(calls[0].args[0].stream).containEql(request.stream)
      should(calls[0].args[0].fromVersionNumber).equal(max([0, request.fromVersionNumber]))
      should(calls[0].args[0].limit).equal(undefined)
      done()
    })
  })
  it('invokes call.write() for every fetched and live event of aggregate, in the right sequence', (done) => {
    let testStream = data.streams.get(random(data.streams.size - 1))
    let testStreamVersion = testStream.get('version')
    let storedEvents = data.events.filter(event => event.get('stream') === testStream.get('id'))
    let fromVersionNumber = storedEvents.get(random(0, storedEvents.size - 1)).get('versionNumber')
    storedEvents = storedEvents.filter(event => event.get('versionNumber') > fromVersionNumber)

    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    let request = {
      stream: testStream.get('id'),
      fromVersionNumber
    }
    implementation.catchUpStream(simulation.call)
    simulation.call.emit('data', request)

    simulation.store.publishEvents([
      {id: 100010, stream: testStream.get('id'), versionNumber: ++testStreamVersion},
      {id: 100011, stream: 'other'},
      {id: 100012, stream: testStream.get('id'), versionNumber: ++testStreamVersion},
      {id: 100013, stream: testStream.get('id'), versionNumber: ++testStreamVersion},
      {id: 100014, stream: 'other'},
      {id: 100015, stream: testStream.get('id'), versionNumber: ++testStreamVersion}
    ])

    setTimeout(() => {
      let writeCalls = simulation.call.write.getCalls()
      should(writeCalls.length).equal(storedEvents.size + 4)
      should(writeCalls.map(({args}) => args[0] && args[0].id)).containDeepOrdered(
        storedEvents.toJS().map(({id}) => id).concat([100010, 100012, 100013, 100015])
      )
      simulation.call.emit('end')
      done()
    }, 150 + (storedEvents.size * 3))
  })
  it('stops invoking call.write() if client ends subscription', (done) => {
    let testStream = data.streams.get(random(data.streams.size - 1))
    let testStreamVersion = testStream.get('version')

    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    let request = {
      stream: testStream.get('id'),
      fromVersion: 1
    }
    implementation.catchUpStream(simulation.call)
    simulation.call.emit('data', request)
    simulation.store.publishEvents([
      {id: 100010, stream: testStream.get('id'), versionNumber: ++testStreamVersion},
      {id: 100011, stream: testStream.get('id'), versionNumber: ++testStreamVersion},
    ])

    setTimeout(() => {
      simulation.store.publishEvents([
        {id: 100012, stream: testStream.get('id'), versionNumber: ++testStreamVersion},
        {id: 100013, stream: testStream.get('id'), versionNumber: ++testStreamVersion},
      ])
    }, 150)

    setTimeout(() => {
      simulation.call.emit('end')
    }, 200)

    setTimeout(() => {
      let calls = simulation.call.write.getCalls()
      let eventIds = calls.map(({args}) => args[0] && args[0].id)
      should(eventIds).containDeepOrdered([100010, 100011])
      should(eventIds).not.containDeepOrdered([100012, 100013])
      done()
    }, 400)
  })
})
