import should from 'should/as-function'
import { random, max, pick } from 'lodash'

import GRPCImplementation from '..'

describe('.subscribeToAggregateStreamFromVersion(call)', () => {
  it('emits `error` on call if call.request.aggregateIdentity is not a valid aggregateIdentity', (done) => {
    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    // No aggregateIdentity
    implementation.subscribeToAggregateStream(simulation.call)
    simulation.call.emit('data', {})

    process.nextTick(() => {
      let emitArgs = simulation.call.emit.secondCall.args

      should(simulation.call.emit.calledTwice).be.True()
      should(emitArgs[0]).equal('error')
      should(emitArgs[1]).be.an.instanceof(Error)

      // Bad aggregateIdentity.id
      simulation = InMemorySimulation(data)
      implementation.subscribeToAggregateStream(simulation.call)
      simulation.call.emit('data', {aggregateIdentity: {id: '', type: 'test'}})

      process.nextTick(() => {
        emitArgs = simulation.call.emit.secondCall.args

        should(simulation.call.emit.calledTwice).be.True()
        should(emitArgs[0]).equal('error')
        should(emitArgs[1]).be.an.instanceof(Error)

        // Bad aggregateIdentity.type
        simulation = InMemorySimulation(data)
        implementation.subscribeToAggregateStream(simulation.call)
        simulation.call.emit('data', {aggregateIdentity: {id: 'test', type: ''}})

        process.nextTick(() => {
          emitArgs = simulation.call.emit.secondCall.args

          should(simulation.call.emit.calledTwice).be.True()
          should(emitArgs[0]).equal('error')
          should(emitArgs[1]).be.an.instanceof(Error)
          done()
        })
      })
    })
  })
  it('invokes backend.getEventsByAggregate() with right parameters', (done) => {
    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    let request = {
      aggregateIdentity: {id: 'uid', type: 'test'},
      fromVersion: random(-10, 10),
      limit: random(-10, 10)
    }
    implementation.subscribeToAggregateStreamFromVersion(simulation.call)
    simulation.call.emit('data', request)

    process.nextTick(() => {
      let calls = simulation.backend.getEventsByAggregate.getCalls()
      should(calls.length === 1).be.True()
      should(calls[0].args[0].aggregateIdentity).containEql(request.aggregateIdentity)
      should(calls[0].args[0].fromVersion).equal(max([0, request.fromVersion]))
      should(calls[0].args[0].limit).equal(undefined)
      done()
    })
  })
  it('invokes call.write() for every fetched and live event of aggregate, in the right sequence', (done) => {
    let testAggregate = data.aggregates.get(random(data.aggregates.size - 1))
    let simulation = InMemorySimulation(data)
    let storedEvents = data.events.filter(evt =>
      evt.get('aggregateId') === testAggregate.get('id') &&
      evt.get('aggregateType') === testAggregate.get('type')
    )
    let minVersion = random(1, storedEvents.size)
    storedEvents = storedEvents.filter(evt => evt.get('sequenceNumber') > minVersion)

    let implementation = GRPCImplementation(simulation)

    let request = {
      aggregateIdentity: pick(testAggregate.toJS(), ['id', 'type']),
      fromVersion: minVersion
    }
    implementation.subscribeToAggregateStreamFromVersion(simulation.call)
    simulation.call.emit('data', request)

    let nextAggregateVersion = testAggregate.get('version') + 1
    simulation.store.publishEvents([
      {id: 100010, aggregateIdentity: request.aggregateIdentity, sequenceNumber: nextAggregateVersion++},
      {id: 100011, aggregateIdentity: {id: 'other', type: 'other'}},
      {id: 100012, aggregateIdentity: request.aggregateIdentity, sequenceNumber: nextAggregateVersion++},
      {id: 100013, aggregateIdentity: request.aggregateIdentity, sequenceNumber: nextAggregateVersion++},
      {id: 100014, aggregateIdentity: {id: 'other', type: 'other'}},
      {id: 100015, aggregateIdentity: request.aggregateIdentity, sequenceNumber: nextAggregateVersion++}
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
    let testAggregate = data.aggregates.get(random(data.aggregates.size - 1))
    let testAggregateVersion = testAggregate.get('version')
    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    let request = {
      aggregateIdentity: pick(testAggregate.toJS(), ['id', 'type']),
      fromVersion: 1
    }
    implementation.subscribeToAggregateStreamFromVersion(simulation.call)
    simulation.call.emit('data', request)
    simulation.store.publishEvents([
      {id: 100010, aggregateIdentity: request.aggregateIdentity, data: '', sequenceNumber: ++testAggregateVersion},
      {id: 100011, aggregateIdentity: request.aggregateIdentity, data: '', sequenceNumber: ++testAggregateVersion}
    ])

    setTimeout(() => {
      simulation.store.publishEvents([
        {id: 100012, aggregateIdentity: request.aggregateIdentity, data: '', sequenceNumber: ++testAggregateVersion},
        {id: 100013, aggregateIdentity: request.aggregateIdentity, data: '', sequenceNumber: ++testAggregateVersion}
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
