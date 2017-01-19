import Ping from './Ping'
import GetUid from './GetUid'

// Category of streams queries
import CatchUpCategoryOfStreams from './categoryOfStreamsQueries/CatchUpCategoryOfStreams'
import ReadCategoryOfStreamsForward from './categoryOfStreamsQueries/ReadCategoryOfStreamsForward'
import SubscribeToCategoryOfStreams from './categoryOfStreamsQueries/SubscribeToCategoryOfStreams'

// Store queries
import CatchUpStoreStream from './storeQueries/CatchUpStoreStream'
import ReadStoreStreamForward from './storeQueries/ReadStoreStreamForward'
import SubscribeToStoreStream from './storeQueries/SubscribeToStoreStream'

// Stream queries
import CatchUpStream from './streamQueries/CatchUpStream'
import ReadStreamForward from './streamQueries/ReadStreamForward'
import SubscribeToStream from './streamQueries/SubscribeToStream'

// Write Procedures
import WriteToStream from './writeProcedures/WriteToStream'
import WriteToMultipleStreams from './writeProcedures/WriteToMultipleStreams'

function GRPCImplementationFactory ({backend, store, writableStreamsPatterns}) {
  let writableStreamsRegexList = writableStreamsPatterns
    ? writableStreamsPatterns.map(str => new RegExp(str))
    : false
  let settings = {backend, store, writableStreamsRegexList}
  return {
    ping: Ping(settings),
    getUid: GetUid(settings),

    // Category of streams queries
    catchUpCategoryOfStreams: CatchUpCategoryOfStreams(settings),
    readCategoryOfStreamsForward: ReadCategoryOfStreamsForward(settings),
    subscribeToCategoryOfStreams: SubscribeToCategoryOfStreams(settings),

    // Store queries
    catchUpStoreStream: CatchUpStoreStream(settings),
    readStoreStreamForward: ReadStoreStreamForward(settings),
    subscribeToStoreStream: SubscribeToStoreStream(settings),

    // Stream queries
    catchUpStream: CatchUpStream(settings),
    readStreamForward: ReadStreamForward(settings),
    subscribeToStream: SubscribeToStream(settings),

    // Write Procedures
    writeToStream: WriteToStream(settings),
    writeToMultipleStreams: WriteToMultipleStreams(settings)
  }
}

export default GRPCImplementationFactory
