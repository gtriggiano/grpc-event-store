import should from 'should/as-function'
import { random } from 'lodash'

import GRPCImplementation from '..'

describe('.getLastAggregateSnapshot(call, callback)', () => {
  it('calls callback(err) if call.request is not a valid aggregateIdentity', () => {
    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    // Bad aggregateIdentity.id
    simulation.call.request = {id: '', type: 'test'}
    implementation.getLastAggregateSnapshot(simulation.call, simulation.callback)
    let callbackArgs = simulation.callback.firstCall.args

    should(simulation.callback.calledOnce).be.True()
    should(callbackArgs[0]).be.an.instanceof(Error)

    // Bad aggregateIdentity.type
    simulation = InMemorySimulation(data)
    simulation.call.request = {id: 'test', type: ''}
    implementation.getLastAggregateSnapshot(simulation.call, simulation.callback)
    callbackArgs = simulation.callback.firstCall.args

    should(simulation.callback.calledOnce).be.True()
    should(callbackArgs[0]).be.an.instanceof(Error)
  })
  it('invokes backend.getLastSnapshotOfAggregate() with right parameters', () => {
    let testSnapshot = data.snapshots.get(random(data.snapshots.size - 1))
    let aggregateIdentity = {
      id: testSnapshot.get('aggregateId'),
      type: testSnapshot.get('aggregateType')
    }

    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    simulation.call.request = aggregateIdentity
    implementation.getLastAggregateSnapshot(simulation.call, simulation.callback)

    let calls = simulation.backend.getLastSnapshotOfAggregate.getCalls()
    should(calls.length).equal(1)
    should(calls[0].args[0].aggregateIdentity).containEql(aggregateIdentity)
  })
  it('invokes callback(null, {snapshot}) if a snapshot is found', (done) => {
    // Take a random snapshot
    let randomSnapshot = data.snapshots.get(random(data.snapshots.size - 1))
    // Get its aggregate's identity
    let aggregateIdentity = {
      id: randomSnapshot.get('aggregateId'),
      type: randomSnapshot.get('aggregateType')
    }
    // Take the last snapshot of the aggregate
    let testSnapshot = data.snapshots.filter(snapshot =>
      snapshot.get('aggregateId') === aggregateIdentity.id &&
      snapshot.get('aggregateType') === aggregateIdentity.type
    ).takeLast(1).get(0)

    let expectedSnapshotResponse = {
      snapshot: {
        aggregateIdentity,
        data: testSnapshot.get('data'),
        version: testSnapshot.get('version')
      }
    }

    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    simulation.call.request = aggregateIdentity
    implementation.getLastAggregateSnapshot(simulation.call, simulation.callback)

    setTimeout(() => {
      let calls = simulation.callback.getCalls()
      should(calls.length).equal(1)
      should(calls[0].args[0]).be.Null()
      should(calls[0].args[1]).containEql(expectedSnapshotResponse)
      done()
    }, 5)
  })
  it('invokes callback(null, {notFound: {}}) if a snapshot is not found', (done) => {
    let aggregateIdentity = {
      id: 'Not',
      type: 'Existent'
    }

    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    simulation.call.request = aggregateIdentity
    implementation.getLastAggregateSnapshot(simulation.call, simulation.callback)

    setTimeout(() => {
      let calls = simulation.callback.getCalls()
      should(calls.length).equal(1)
      should(calls[0].args[0]).be.Null()
      should(calls[0].args[1]).containEql({notFound: {}})
      done()
    }, 5)
  })
})
