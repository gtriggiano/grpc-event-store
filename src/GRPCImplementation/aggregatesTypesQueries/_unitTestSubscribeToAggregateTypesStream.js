import should from 'should/as-function'
import { sample, sampleSize } from 'lodash'

import GRPCImplementation from '..'

describe('.subscribeToAggregateTypesStream(call)', () => {
  it('emits `error` on call if call.request.aggregateTypes is not a valid list of strings', (done) => {
    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    // No aggregateTypes
    let request = {
      aggregateTypes: [],
      fromEventId: 0
    }
    implementation.subscribeToAggregateTypesStream(simulation.call)
    simulation.call.emit('data', request)

    process.nextTick(() => {
      let emitArgs = simulation.call.emit.secondCall.args

      should(simulation.call.emit.calledTwice).be.True()
      should(emitArgs[0]).equal('error')
      should(emitArgs[1]).be.an.instanceof(Error)

      // Bad aggregateTypes
      simulation = InMemorySimulation(data)
      request = {
        aggregateTypes: [''],
        fromEventId: 0
      }
      implementation.subscribeToAggregateTypesStream(simulation.call)
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
  it('invokes call.write() for every live event about aggregate of given types', (done) => {
    let testAggregateTypes = sampleSize(AGGREGATE_TYPES.toJS(), 2)

    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    let request = {
      aggregateTypes: testAggregateTypes
    }
    implementation.subscribeToAggregateTypesStream(simulation.call)
    simulation.call.emit('data', request)
    simulation.store.publishEvents([
      {id: 100010, aggregateIdentity: {id: 'anid', type: sample(testAggregateTypes)}},
      {id: 100011, aggregateIdentity: {id: 'other', type: 'other'}},
      {id: 100012, aggregateIdentity: {id: 'anid', type: sample(testAggregateTypes)}}
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
    let testAggregateTypes = sampleSize(AGGREGATE_TYPES.toJS(), 2)

    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    let request = {
      aggregateTypes: testAggregateTypes
    }
    implementation.subscribeToAggregateTypesStream(simulation.call)
    simulation.call.emit('data', request)
    simulation.store.publishEvents([
      {id: 100010, aggregateIdentity: {id: 'anid', type: sample(testAggregateTypes)}},
      {id: 100011, aggregateIdentity: {id: 'other', type: 'other'}},
      {id: 100012, aggregateIdentity: {id: 'anid', type: sample(testAggregateTypes)}}
    ])

    setTimeout(() => {
      simulation.store.publishEvents([
        {id: 100013, aggregateIdentity: {id: 'anid', type: sample(testAggregateTypes)}},
        {id: 100014, aggregateIdentity: {id: 'anid', type: sample(testAggregateTypes)}}
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
