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

  describe('Aggregates Queries', function () {
    require('./GRPCImplementation/aggregatesQueries/_unitTestGetLastAggregateSnapshot')
    require('./GRPCImplementation/aggregatesQueries/_unitTestReadAggregateStreamForwardFromVersion')
    require('./GRPCImplementation/aggregatesQueries/_unitTestSubscribeToAggregateStream')
    require('./GRPCImplementation/aggregatesQueries/_unitTestSubscribeToAggregateStreamFromVersion')
  })

  describe('Aggregates Types Queries', function () {
    require('./GRPCImplementation/aggregatesTypesQueries/_unitTestReadAggregateTypesStreamForwardFromEvent')
    require('./GRPCImplementation/aggregatesTypesQueries/_unitTestSubscribeToAggregateTypesStream')
    require('./GRPCImplementation/aggregatesTypesQueries/_unitTestSubscribeToAggregateTypesStreamFromEvent')
  })

  describe('Events Types Queries', function () {
    require('./GRPCImplementation/eventsTypesQueries/_unitTestReadEventTypesStreamForwardFromEvent')
    require('./GRPCImplementation/eventsTypesQueries/_unitTestSubscribeToEventTypesStream')
    require('./GRPCImplementation/eventsTypesQueries/_unitTestSubscribeToEventTypesStreamFromEvent')
  })

  describe('Store Queries', function () {
    require('./GRPCImplementation/storeQueries/_unitTestReadStoreStreamForwardFromEvent')
    require('./GRPCImplementation/storeQueries/_unitTestSubscribeToStoreStream')
    require('./GRPCImplementation/storeQueries/_unitTestSubscribeToStoreStreamFromEvent')
  })

  describe('Write Procedures', function () {
    require('./GRPCImplementation/writeProcedures/_unitTestWriteToAggregateStream')
    require('./GRPCImplementation/writeProcedures/_unitTestWriteToMultipleAggregateStreams')
  })
})
