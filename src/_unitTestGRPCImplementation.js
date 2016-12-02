import should from 'should/as-function'

import GRPCImplementation from './GRPCImplementation'

describe('GRPCImplementation({backend, store})', () => {
  it('is a function', () => should(GRPCImplementation).be.a.Function())
  it('returns a map of functions', () => {
    let simulation = InMemorySimulation(data)
    let implementation = GRPCImplementation(simulation)
    should(implementation).be.an.Object()
    Object.keys(implementation).forEach(
      handler => should(implementation[handler]).be.a.Function()
    )
  })
  require('./GRPCImplementation/_unitTestPing')
  require('./GRPCImplementation/_unitTestGetUid')

  describe('Category of streams Queries', function () {
    require('./GRPCImplementation/categoryOfStreamsQueries/_unitTestCatchUpCategoryOfStreams')
    require('./GRPCImplementation/categoryOfStreamsQueries/_unitTestReadCategoryOfStreamsForward')
    require('./GRPCImplementation/categoryOfStreamsQueries/_unitTestSubscribeToCategoryOfStreams')
  })

  describe('Store Queries', function () {
    require('./GRPCImplementation/storeQueries/_unitTestReadStoreStreamForward')
    require('./GRPCImplementation/storeQueries/_unitTestSubscribeToStoreStream')
    require('./GRPCImplementation/storeQueries/_unitTestCatchUpStoreStream')
  })

  describe('Stream Queries', function () {
    require('./GRPCImplementation/streamQueries/_unitTestCatchUpStream')
    require('./GRPCImplementation/streamQueries/_unitTestReadStreamForward')
    require('./GRPCImplementation/streamQueries/_unitTestSubscribeToStream')
  })

  describe('Write Procedures', function () {
    require('./GRPCImplementation/writeProcedures/_unitTestWriteToStream')
    require('./GRPCImplementation/writeProcedures/_unitTestWriteToMultipleStreams')
  })
})
