import should from 'should/as-function'
import shortid from 'shortid'

import GRPCImplementation from '..'

describe('.writeToStream(call, callback)', () => {
  it('invokes callback(error) if call.request.stream is not a valid string', () => {
    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    // No stream
    simulation.call.request = {
      stream: '',
      events: [{type: 'Test'}]
    }
    implementation.writeToStream(simulation.call, simulation.callback)
    let callbackCalls = simulation.callback.getCalls()
    should(callbackCalls.length).equal(1)
    should(callbackCalls[0].args.length).equal(1)
    should(callbackCalls[0].args[0]).be.instanceof(Error)
    should(callbackCalls[0].args[0].message.match(/stream MUST be a nonempty string/).length).equal(1)
  })
  it('invokes callback(error) if call.request.events is not a nonempty list of valid events to store', () => {
    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    // Empty list of events
    simulation.call.request = {
      stream: 'StreamX',
      events: []
    }
    implementation.writeToStream(simulation.call, simulation.callback)
    let callbackCalls = simulation.callback.getCalls()
    should(callbackCalls.length).equal(1)
    should(callbackCalls[0].args.length).equal(1)
    should(callbackCalls[0].args[0]).be.instanceof(Error)
    should(callbackCalls[0].args[0].message.match(/events MUST be a nonempty list of events to store/).length).equal(1)

    // Bad events in the list
    simulation = InMemorySimulation(data)
    simulation.call.request = {
      stream: 'StreamX',
      events: [{type: 'type', data: 'data'}, {data: 'data'}]
    }
    implementation.writeToStream(simulation.call, simulation.callback)
    callbackCalls = simulation.callback.getCalls()
    should(callbackCalls.length).equal(1)
    should(callbackCalls[0].args.length).equal(1)
    should(callbackCalls[0].args[0]).be.instanceof(Error)
    should(callbackCalls[0].args[0].message.match(/all events MUST have a valid type/).length).equal(1)
  })
  it('invokes backend.storeEvents() with right parameters', () => {
    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    let stream = 'StreamX'
    let events = [{type: 'TypeOne'}, {type: 'TypeTwo', data: 'two'}]
    let expectedVersionNumber = 10
    simulation.call.request = {
      stream,
      events,
      expectedVersionNumber
    }

    implementation.writeToStream(simulation.call, simulation.callback)
    let backendCalls = simulation.backend.storeEvents.getCalls()
    should(backendCalls.length).equal(1)
    should(backendCalls[0].args[0].writeRequests.length).equal(1)
    should(backendCalls[0].args[0].writeRequests[0]).eql({
      stream,
      events: events.map(e => ({
        data: '',
        ...e
      })),
      expectedVersionNumber
    })
    should(backendCalls[0].args[0].transactionId).be.a.String()
    should(shortid.isValid(backendCalls[0].args[0].transactionId)).be.True()
  })
  it('invokes callback(err) if there is an error writing the events', (done) => {
    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    let errMsg = `failure ${shortid()}`
    simulation.call.request = {
      stream: 'StreamX',
      events: [{type: 'TypeOne', data: 'one'}, {type: 'TypeTwo', data: errMsg}],
      expectedVersionNumber: 0
    }

    implementation.writeToStream(simulation.call, simulation.callback)
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

    let stream = 'StreamX'
    let events = [{type: 'TypeOne', data: 'one'}, {type: 'TypeTwo'}]
    let expectedStoredEvents = events.map((e, idx) => ({
      id: `0${idx}`,
      stream,
      data: '',
      ...e
    }))
    simulation.call.request = {
      stream,
      events,
      expectedVersionNumber: 0
    }

    implementation.writeToStream(simulation.call, simulation.callback)
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
