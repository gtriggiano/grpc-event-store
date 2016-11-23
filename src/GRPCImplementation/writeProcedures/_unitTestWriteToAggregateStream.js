import should from 'should/as-function'
import shortid from 'shortid'

import GRPCImplementation from '..'

describe('.writeToAggregateStream(call, callback)', () => {
  it('invokes callback(error) if call.request.aggregateIdentity is not a valid aggregateIdentity', () => {
    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    // No aggregateIdentity
    simulation.call.request = {events: [{type: 'Test'}]}
    implementation.writeToAggregateStream(simulation.call, simulation.callback)
    let callbackCalls = simulation.callback.getCalls()
    should(callbackCalls.length).equal(1)
    should(callbackCalls[0].args.length).equal(1)
    should(callbackCalls[0].args[0]).be.instanceof(Error)
    should(callbackCalls[0].args[0].message.match(/aggregateIdentity cannot be undefined/).length).equal(1)

    // Bad aggregateIdentity.id
    simulation = InMemorySimulation(data)
    simulation.call.request = {
      aggregateIdentity: {id: '', type: 'Test'},
      events: [{type: 'Test'}]
    }
    implementation.writeToAggregateStream(simulation.call, simulation.callback)
    callbackCalls = simulation.callback.getCalls()
    should(callbackCalls.length).equal(1)
    should(callbackCalls[0].args.length).equal(1)
    should(callbackCalls[0].args[0]).be.instanceof(Error)
    should(callbackCalls[0].args[0].message.match(/aggregateIdentity\.id should be a nonempty string/).length).equal(1)

    // Bad aggregateIdentity.type
    simulation = InMemorySimulation(data)
    simulation.call.request = {
      aggregateIdentity: {id: 'Test', type: ''},
      events: [{type: 'Test'}]
    }
    implementation.writeToAggregateStream(simulation.call, simulation.callback)
    callbackCalls = simulation.callback.getCalls()
    should(callbackCalls.length).equal(1)
    should(callbackCalls[0].args.length).equal(1)
    should(callbackCalls[0].args[0]).be.instanceof(Error)
    should(callbackCalls[0].args[0].message.match(/aggregateIdentity\.type should be a nonempty string/).length).equal(1)
  })
  it('invokes callback(error) if call.request.events is not a nonempty list of valid events to store', () => {
    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    // Empty list of events
    simulation.call.request = {
      aggregateIdentity: {id: 'id', type: 'type'},
      events: []
    }
    implementation.writeToAggregateStream(simulation.call, simulation.callback)
    let callbackCalls = simulation.callback.getCalls()
    should(callbackCalls.length).equal(1)
    should(callbackCalls[0].args.length).equal(1)
    should(callbackCalls[0].args[0]).be.instanceof(Error)
    should(callbackCalls[0].args[0].message.match(/events should be a nonempty list of events to store/).length).equal(1)

    // Bad events in the list
    simulation = InMemorySimulation(data)
    simulation.call.request = {
      aggregateIdentity: {id: 'id', type: 'type'},
      events: [{type: 'type', data: 'data'}, {data: 'data'}]
    }
    implementation.writeToAggregateStream(simulation.call, simulation.callback)
    callbackCalls = simulation.callback.getCalls()
    should(callbackCalls.length).equal(1)
    should(callbackCalls[0].args.length).equal(1)
    should(callbackCalls[0].args[0]).be.instanceof(Error)
    should(callbackCalls[0].args[0].message.match(/all events should have a valid type/).length).equal(1)
  })
  it('invokes backend.storeEvents() with right parameters', () => {
    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    let aggregateIdentity = {id: 'id', type: 'type'}
    let events = [{type: 'TypeOne', data: 'one'}, {type: 'TypeTwo', data: 'two'}]
    let expectedAggregateVersion = 10
    let snapshot = 'snapshot'
    simulation.call.request = {
      aggregateIdentity,
      events,
      expectedAggregateVersion,
      snapshot
    }

    implementation.writeToAggregateStream(simulation.call, simulation.callback)
    let backendCalls = simulation.backend.storeEvents.getCalls()
    should(backendCalls.length).equal(1)
    should(backendCalls[0].args[0].writeRequests.length).equal(1)
    should(backendCalls[0].args[0].writeRequests[0]).eql({
      aggregateIdentity,
      events: events.map(e => ({
        data: '',
        metadata: '',
        ...e
      })),
      expectedAggregateVersion,
      snapshot
    })
    should(backendCalls[0].args[0].transactionId).be.a.String()
    should(shortid.isValid(backendCalls[0].args[0].transactionId)).be.True()
  })
  it('invokes callback(err) if there is an error writing the events', (done) => {
    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    let errMsg = `failure ${shortid()}`
    simulation.call.request = {
      aggregateIdentity: {id: 'id', type: 'type'},
      events: [{type: 'TypeOne', data: 'one'}, {type: 'TypeTwo', data: 'two', metadata: errMsg}],
      expectedAggregateVersion: 0
    }

    implementation.writeToAggregateStream(simulation.call, simulation.callback)
    setTimeout(() => {
      let callbackCalls = simulation.callback.getCalls()
      should(callbackCalls.length).equal(1)
      should(callbackCalls[0].args.length).equal(1)
      should(callbackCalls[0].args[0]).be.instanceof(Error)
      should(callbackCalls[0].args[0].message.match(new RegExp(errMsg)).length).equal(1)
      done()
    }, 5)
  })
  it('invokes callback(null, {events}) if the events writing is succcessful', (done) => {
    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    let aggregateIdentity = {id: 'id', type: 'type'}
    let events = [{type: 'TypeOne', data: 'one'}, {type: 'TypeTwo'}]
    let expectedStoredEvents = events.map((e, idx) => ({
      id: `0${idx}`,
      aggregateIdentity,
      data: '',
      metadata: '',
      ...e
    }))
    simulation.call.request = {
      aggregateIdentity,
      events,
      expectedAggregateVersion: 0
    }

    implementation.writeToAggregateStream(simulation.call, simulation.callback)
    setTimeout(() => {
      let callbackCalls = simulation.callback.getCalls()
      should(callbackCalls.length).equal(1)
      should(callbackCalls[0].args.length).equal(2)
      should(callbackCalls[0].args[0]).be.Null()
      should(callbackCalls[0].args[1]).eql({events: expectedStoredEvents})
      done()
    }, 5)
  })
})
