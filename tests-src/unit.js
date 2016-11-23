import path from 'path'
import should from 'should/as-function'
import EventEmitter from 'eventemitter3'

import FixtureBusNode from './FixtureBusNode'
import InMemorySimulation, { getSimulationData, AGGREGATE_TYPES } from './InMemorySimulation'
global.data = getSimulationData()
global.FixtureBusNode = FixtureBusNode
global.InMemorySimulation = InMemorySimulation
global.AGGREGATE_TYPES = AGGREGATE_TYPES

var codePath = path.resolve(__dirname, '..', process.env.CODE_PATH)
function pathTo (dest) {
  return path.resolve(codePath, dest)
}

var lib = require(codePath)
var ServiceNode = lib.ServiceNode

describe('GRPC Event Store Package Unit Tests', function () {
  it('should be fun to work with', () => {})
  it(`let ServiceNode = require('grpc-event-store').ServiceNode; typeof ServiceNode === 'function'`, () => {
    should(ServiceNode).be.a.Function()
  })
  it(`let eventStoreNode = ServiceNode(); eventStoreNode instanceof EventEmitter === true`, () => {
    let eventStore = ServiceNode()
    should(eventStore).be.an.instanceof(EventEmitter)
  })
})

require(pathTo('_unitTestUtils'))
require(pathTo('_unitTestBackendInterface'))
require(pathTo('_unitTestStoreInterface'))
require(pathTo('_unitTestGRPCInterface'))
require(pathTo('_unitTestGRPCImplementation'))
require(pathTo('_unitTestServiceNode'))
