'use strict';

var _asFunction = require('should/as-function');

var _asFunction2 = _interopRequireDefault(_asFunction);

var _GRPCImplementation = require('./GRPCImplementation');

var _GRPCImplementation2 = _interopRequireDefault(_GRPCImplementation);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

describe('GRPCImplementation({backend, store, writableStreamsPatterns})', function () {
  it('is a function', function () {
    return (0, _asFunction2.default)(_GRPCImplementation2.default).be.a.Function();
  });
  it('returns a map of functions', function () {
    var simulation = InMemorySimulation(data);
    var implementation = (0, _GRPCImplementation2.default)(simulation);
    (0, _asFunction2.default)(implementation).be.an.Object();
    Object.keys(implementation).forEach(function (handler) {
      return (0, _asFunction2.default)(implementation[handler]).be.a.Function();
    });
  });
  require('./GRPCImplementation/_unitTestPing');
  require('./GRPCImplementation/_unitTestGetUid');

  describe('Category of streams Queries', function () {
    require('./GRPCImplementation/categoryOfStreamsQueries/_unitTestCatchUpCategoryOfStreams');
    require('./GRPCImplementation/categoryOfStreamsQueries/_unitTestReadCategoryOfStreamsForward');
    require('./GRPCImplementation/categoryOfStreamsQueries/_unitTestSubscribeToCategoryOfStreams');
  });

  describe('Store Queries', function () {
    require('./GRPCImplementation/storeQueries/_unitTestReadStoreStreamForward');
    require('./GRPCImplementation/storeQueries/_unitTestSubscribeToStoreStream');
    require('./GRPCImplementation/storeQueries/_unitTestCatchUpStoreStream');
  });

  describe('Stream Queries', function () {
    require('./GRPCImplementation/streamQueries/_unitTestCatchUpStream');
    require('./GRPCImplementation/streamQueries/_unitTestReadStreamForward');
    require('./GRPCImplementation/streamQueries/_unitTestSubscribeToStream');
  });

  describe('Write Procedures', function () {
    require('./GRPCImplementation/writeProcedures/_unitTestWriteToStream');
    require('./GRPCImplementation/writeProcedures/_unitTestWriteToMultipleStreams');
  });
});