import should from 'should/as-function'
import shortid from 'shortid'

import GRPCImplementation from '.'

describe('.getUid(_, callback)', () => {
  it('calls callback(null, {uid})', () => {
    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)
    implementation.getUid(simulation.call, simulation.callback)
    should(simulation.callback.callCount).equal(1)
    let callArgs = simulation.callback.firstCall.args
    should(callArgs[0]).be.Null()
    should(callArgs[1]).be.an.Object()
    should(shortid.isValid(callArgs[1].uid)).be.True()
  })
})
