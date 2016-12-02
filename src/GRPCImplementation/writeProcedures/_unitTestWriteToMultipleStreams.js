import should from 'should/as-function'
import shortid from 'shortid'

import GRPCImplementation from '..'

describe('.writeToMultipleStreams(call, callback)', function () {
  it('invokes callback(error) if !call.request.writeRequests.length', () => {
    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    simulation.call.request = {
      writeRequests: []
    }
    implementation.writeToMultipleStreams(simulation.call, simulation.callback)

    let callbackCalls = simulation.callback.getCalls()
    should(callbackCalls.length).equal(1)
    should(callbackCalls[0].args.length).equal(1)
    should(callbackCalls[0].args[0]).be.an.instanceof(Error)
    should(callbackCalls[0].args[0].message.match(/writeRequests should be a list of event storage requests/).length).equal(1)
  })
  it('invokes callback(error) if anyone of call.request.writeRequests is not a valid writeRequest', () => {
    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    // Missing stream
    simulation.call.request = {
      writeRequests: [
        {
          stream: '',
          events: [{type: 'Test'}]
        },
        {
          stream: 'StreamX',
          events: [{type: 'Test'}]
        }
      ]
    }
    implementation.writeToMultipleStreams(simulation.call, simulation.callback)
    let callbackCalls = simulation.callback.getCalls()
    should(callbackCalls.length).equal(1)
    should(callbackCalls[0].args.length).equal(1)
    should(callbackCalls[0].args[0]).be.instanceof(Error)
    should(callbackCalls[0].args[0].message.match(/stream MUST be a nonempty string/).length).equal(1)

    // Missing events
    simulation = InMemorySimulation(data)
    simulation.call.request = {
      writeRequests: [
        {
          stream: 'StreamX',
          events: [{type: 'Test'}]
        },
        {
          stream: 'StreamY'
        }
      ]
    }
    implementation.writeToMultipleStreams(simulation.call, simulation.callback)
    callbackCalls = simulation.callback.getCalls()
    should(callbackCalls.length).equal(1)
    should(callbackCalls[0].args.length).equal(1)
    should(callbackCalls[0].args[0]).be.instanceof(Error)
    should(callbackCalls[0].args[0].message.match(/events MUST be a nonempty list of events to store/).length).equal(1)

    // Empty events
    simulation = InMemorySimulation(data)
    simulation.call.request = {
      writeRequests: [
        {
          stream: 'StreamX',
          events: [{type: 'Test'}]
        },
        {
          stream: 'StreamY',
          events: []
        }
      ]
    }
    implementation.writeToMultipleStreams(simulation.call, simulation.callback)
    callbackCalls = simulation.callback.getCalls()
    should(callbackCalls.length).equal(1)
    should(callbackCalls[0].args.length).equal(1)
    should(callbackCalls[0].args[0]).be.instanceof(Error)
    should(callbackCalls[0].args[0].message.match(/events MUST be a nonempty list of events to store/).length).equal(1)

    // Bad event
    simulation = InMemorySimulation(data)
    simulation.call.request = {
      writeRequests: [
        {
          stream: 'StreamX',
          events: [{type: 'Test'}]
        },
        {
          stream: 'StreamY',
          events: [{type: 'Test'}, {type: ''}]
        }
      ]
    }
    implementation.writeToMultipleStreams(simulation.call, simulation.callback)
    callbackCalls = simulation.callback.getCalls()
    should(callbackCalls.length).equal(1)
    should(callbackCalls[0].args.length).equal(1)
    should(callbackCalls[0].args[0]).be.instanceof(Error)
    should(callbackCalls[0].args[0].message.match(/all events MUST have a valid type/).length).equal(1)
  })
  it('invokes callback(error) if each writeRequest does not concern a different stream', () => {
    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    simulation.call.request = {
      writeRequests: [
        {
          stream: 'StreamX',
          events: [{type: 'Test'}]
        },
        {
          stream: 'StreamX',
          events: [{type: 'TestTwo'}]
        }
      ]
    }
    implementation.writeToMultipleStreams(simulation.call, simulation.callback)
    let callbackCalls = simulation.callback.getCalls()
    should(callbackCalls.length).equal(1)
    should(callbackCalls[0].args.length).equal(1)
    should(callbackCalls[0].args[0]).be.instanceof(Error)
    should(callbackCalls[0].args[0].message.match(/each writeRequest should concern a different stream/).length).equal(1)
  })
  it('invokes backend.storeEvents() with right parameters', () => {
    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)

    simulation.call.request = {
      writeRequests: [
        {
          stream: 'StreamX',
          events: [{type: 'Test'}],
          expectedVersionNumber: 3
        },
        {
          stream: 'StreamY',
          events: [{type: 'TestTwo', data: 'hello'}],
          expectedVersionNumber: -10
        }
      ]
    }
    implementation.writeToMultipleStreams(simulation.call, simulation.callback)
    let backendCalls = simulation.backend.storeEvents.getCalls()
    should(backendCalls.length).equal(1)
    should(backendCalls[0].args[0].writeRequests.length).equal(2)
    should(backendCalls[0].args[0].writeRequests).eql([
      {
        stream: 'StreamX',
        events: [{type: 'Test', data: ''}],
        expectedVersionNumber: 3
      },
      {
        stream: 'StreamY',
        events: [{type: 'TestTwo', data: 'hello'}],
        expectedVersionNumber: -2
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
          stream: 'StreamX',
          events: [{type: 'Test'}],
          expectedVersionNumber: 3
        },
        {
          stream: 'StreamY',
          events: [{type: 'TestTwo', data: errMsg}],
          expectedVersionNumber: -10
        }
      ]
    }

    implementation.writeToMultipleStreams(simulation.call, simulation.callback)
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
          stream: 'StreamX',
          events: [{type: 'Test'}],
          expectedVersionNumber: 3
        },
        {
          stream: 'StreamY',
          events: [{type: 'TestTwo', data: 'hello'}],
          expectedVersionNumber: -2
        }
      ]
    }

    implementation.writeToMultipleStreams(simulation.call, simulation.callback)
    setTimeout(() => {
      let callbackCalls = simulation.callback.getCalls()
      should(callbackCalls.length).equal(1)
      should(callbackCalls[0].args.length).equal(2)
      should(callbackCalls[0].args[0]).be.Null()
      should(callbackCalls[0].args[1]).eql({
        events: simulation.call.request.writeRequests.reduce((storedEvents, request, rIdx) => {
          return storedEvents.concat(request.events.map((e, eIdx) => ({
            id: `${rIdx}${eIdx}`,
            stream: request.stream,
            data: '',
            ...e
          })))
        }, [])
      })
      done()
    }, 5)
  })
})
