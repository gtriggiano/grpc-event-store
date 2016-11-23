import should from 'should/as-function'
import shortid from 'shortid'

import GRPCImplementation from '..'

describe('.writeToMultipleAggregateStreams(call, callback)', function () {
  it('invokes callback(error) if !call.request.writeRequests.length', () => {
    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    simulation.call.request = {
      writeRequests: []
    }
    implementation.writeToMultipleAggregateStreams(simulation.call, simulation.callback)

    let callbackCalls = simulation.callback.getCalls()
    should(callbackCalls.length).equal(1)
    should(callbackCalls[0].args.length).equal(1)
    should(callbackCalls[0].args[0]).be.an.instanceof(Error)
    should(callbackCalls[0].args[0].message.match(/writingRequests should be a list of event storage requests/).length).equal(1)
  })
  it('invokes callback(error) if anyone of call.request.writeRequests is not a valid writeRequest', () => {
    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    // Missing aggregateIdentity
    simulation.call.request = {
      writeRequests: [
        {
          aggregateIdentity: {id: 'Id', type: 'TypeOne'},
          events: [{type: 'Test'}]
        },
        {
          events: [{type: 'Test'}]
        }
      ]
    }
    implementation.writeToMultipleAggregateStreams(simulation.call, simulation.callback)
    let callbackCalls = simulation.callback.getCalls()
    should(callbackCalls.length).equal(1)
    should(callbackCalls[0].args.length).equal(1)
    should(callbackCalls[0].args[0]).be.instanceof(Error)
    should(callbackCalls[0].args[0].message.match(/aggregateIdentity cannot be undefined/).length).equal(1)

    // Bad aggregateIdentity.type
    simulation = InMemorySimulation(data)
    simulation.call.request = {
      writeRequests: [
        {
          aggregateIdentity: {id: 'Id', type: 'TypeOne'},
          events: [{type: 'Test'}]
        },
        {
          aggregateIdentity: {id: 'Id', type: ''},
          events: [{type: 'Test'}]
        }
      ]
    }
    implementation.writeToMultipleAggregateStreams(simulation.call, simulation.callback)
    callbackCalls = simulation.callback.getCalls()
    should(callbackCalls.length).equal(1)
    should(callbackCalls[0].args.length).equal(1)
    should(callbackCalls[0].args[0]).be.instanceof(Error)
    should(callbackCalls[0].args[0].message.match(/aggregateIdentity\.type should be a nonempty string/).length).equal(1)

    // Bad aggregateIdentity.id
    simulation = InMemorySimulation(data)
    simulation.call.request = {
      writeRequests: [
        {
          aggregateIdentity: {id: 'Id', type: 'TypeOne'},
          events: [{type: 'Test'}]
        },
        {
          aggregateIdentity: {id: '', type: 'TypeTwo'},
          events: [{type: 'Test'}]
        }
      ]
    }
    implementation.writeToMultipleAggregateStreams(simulation.call, simulation.callback)
    callbackCalls = simulation.callback.getCalls()
    should(callbackCalls.length).equal(1)
    should(callbackCalls[0].args.length).equal(1)
    should(callbackCalls[0].args[0]).be.instanceof(Error)
    should(callbackCalls[0].args[0].message.match(/aggregateIdentity\.id should be a nonempty string/).length).equal(1)

    // Missing events
    simulation = InMemorySimulation(data)
    simulation.call.request = {
      writeRequests: [
        {
          aggregateIdentity: {id: 'Id', type: 'TypeOne'},
          events: [{type: 'Test'}]
        },
        {
          aggregateIdentity: {id: 'Id', type: 'TypeTwo'}
        }
      ]
    }
    implementation.writeToMultipleAggregateStreams(simulation.call, simulation.callback)
    callbackCalls = simulation.callback.getCalls()
    should(callbackCalls.length).equal(1)
    should(callbackCalls[0].args.length).equal(1)
    should(callbackCalls[0].args[0]).be.instanceof(Error)
    should(callbackCalls[0].args[0].message.match(/events should be a nonempty list of events to store/).length).equal(1)

    // Empty events
    simulation = InMemorySimulation(data)
    simulation.call.request = {
      writeRequests: [
        {
          aggregateIdentity: {id: 'Id', type: 'TypeOne'},
          events: [{type: 'Test'}]
        },
        {
          aggregateIdentity: {id: 'Id', type: 'TypeTwo'},
          events: []
        }
      ]
    }
    implementation.writeToMultipleAggregateStreams(simulation.call, simulation.callback)
    callbackCalls = simulation.callback.getCalls()
    should(callbackCalls.length).equal(1)
    should(callbackCalls[0].args.length).equal(1)
    should(callbackCalls[0].args[0]).be.instanceof(Error)
    should(callbackCalls[0].args[0].message.match(/events should be a nonempty list of events to store/).length).equal(1)

    // Bad event
    simulation = InMemorySimulation(data)
    simulation.call.request = {
      writeRequests: [
        {
          aggregateIdentity: {id: 'Id', type: 'TypeOne'},
          events: [{type: 'Test'}]
        },
        {
          aggregateIdentity: {id: 'Id', type: 'TypeTwo'},
          events: [{type: 'Test'}, {type: ''}]
        }
      ]
    }
    implementation.writeToMultipleAggregateStreams(simulation.call, simulation.callback)
    callbackCalls = simulation.callback.getCalls()
    should(callbackCalls.length).equal(1)
    should(callbackCalls[0].args.length).equal(1)
    should(callbackCalls[0].args[0]).be.instanceof(Error)
    should(callbackCalls[0].args[0].message.match(/all events should have a valid type/).length).equal(1)
  })
  it('invokes callback(error) if each writeRequest does not concern a different aggregate', () => {
    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    simulation.call.request = {
      writeRequests: [
        {
          aggregateIdentity: {id: 'Id', type: 'TypeOne'},
          events: [{type: 'Test'}]
        },
        {
          aggregateIdentity: {id: 'Id', type: 'TypeOne'},
          events: [{type: 'TestTwo'}]
        }
      ]
    }
    implementation.writeToMultipleAggregateStreams(simulation.call, simulation.callback)
    let callbackCalls = simulation.callback.getCalls()
    should(callbackCalls.length).equal(1)
    should(callbackCalls[0].args.length).equal(1)
    should(callbackCalls[0].args[0]).be.instanceof(Error)
    should(callbackCalls[0].args[0].message.match(/each writeRequest should concern a different aggregate/).length).equal(1)
  })
  it('invokes backend.storeEvents() with right parameters', () => {
    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    simulation.call.request = {
      writeRequests: [
        {
          aggregateIdentity: {id: 'Id', type: 'TypeOne'},
          events: [{type: 'Test'}],
          expectedAggregateVersion: 3
        },
        {
          aggregateIdentity: {id: 'Id', type: 'TypeTwo'},
          events: [{type: 'TestTwo', data: 'hello'}],
          expectedAggregateVersion: -10
        }
      ]
    }
    implementation.writeToMultipleAggregateStreams(simulation.call, simulation.callback)
    let backendCalls = simulation.backend.storeEvents.getCalls()
    should(backendCalls.length).equal(1)
    should(backendCalls[0].args[0].writeRequests.length).equal(2)
    should(backendCalls[0].args[0].writeRequests).eql([
      {
        aggregateIdentity: {id: 'Id', type: 'TypeOne'},
        events: [{type: 'Test', data: '', metadata: ''}],
        expectedAggregateVersion: 3
      },
      {
        aggregateIdentity: {id: 'Id', type: 'TypeTwo'},
        events: [{type: 'TestTwo', data: 'hello', metadata: ''}],
        expectedAggregateVersion: -1
      }
    ])
    should(backendCalls[0].args[0].transactionId).be.a.String()
    should(shortid.isValid(backendCalls[0].args[0].transactionId)).be.True()
  })
  it('invokes callback(err) if there is an error executing any of the writeRequests', (done) => {
    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    let errMsg = `failure ${shortid()}`
    simulation.call.request = {
      writeRequests: [
        {
          aggregateIdentity: {id: 'Id', type: 'TypeOne'},
          events: [{type: 'Test'}],
          expectedAggregateVersion: 3
        },
        {
          aggregateIdentity: {id: 'Id', type: 'TypeTwo'},
          events: [{type: 'TestTwo', data: 'hello', metadata: errMsg}],
          expectedAggregateVersion: -10
        }
      ]
    }

    implementation.writeToMultipleAggregateStreams(simulation.call, simulation.callback)
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

    simulation.call.request = {
      writeRequests: [
        {
          aggregateIdentity: {id: 'Id', type: 'TypeOne'},
          events: [{type: 'Test'}],
          expectedAggregateVersion: 3
        },
        {
          aggregateIdentity: {id: 'Id', type: 'TypeTwo'},
          events: [{type: 'TestTwo', data: 'hello', metadata: 'world'}],
          expectedAggregateVersion: -10
        }
      ]
    }

    implementation.writeToMultipleAggregateStreams(simulation.call, simulation.callback)
    setTimeout(() => {
      let callbackCalls = simulation.callback.getCalls()
      should(callbackCalls.length).equal(1)
      should(callbackCalls[0].args.length).equal(2)
      should(callbackCalls[0].args[0]).be.Null()
      should(callbackCalls[0].args[1]).eql({
        events: simulation.call.request.writeRequests.reduce((storedEvents, request, rIdx) => {
          return storedEvents.concat(request.events.map((e, eIdx) => ({
            id: `${rIdx}${eIdx}`,
            aggregateIdentity: request.aggregateIdentity,
            data: '',
            metadata: '',
            ...e
          })))
        }, [])
      })
      done()
    }, 5)
  })
})
