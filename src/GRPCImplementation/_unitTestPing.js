import should from 'should/as-function'

import GRPCImplementation from '.'

describe('.ping(_, callback)', () => {
  it('calls callback(null, {})', () => {
    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)
    implementation.ping(simulation.call, simulation.callback)
    should(simulation.callback.callCount).equal(1)
    let callArgs = simulation.callback.firstCall.args
    should(callArgs[0]).be.Null()
    should(callArgs[1]).be.an.Object()
    should(Object.keys(callArgs[1]).length).equal(0)
  })
})
