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

function GRPCImplementationFactory ({backend, store}) {
  let interfaces = {backend, store}
  return {
    ping: Ping(interfaces),
    getUid: GetUid(interfaces),

    // Category of streams queries
    catchUpCategoryOfStreams: CatchUpCategoryOfStreams(interfaces),
    readCategoryOfStreamsForward: ReadCategoryOfStreamsForward(interfaces),
    subscribeToCategoryOfStreams: SubscribeToCategoryOfStreams(interfaces),

    // Store queries
    catchUpStoreStream: CatchUpStoreStream(interfaces),
    readStoreStreamForward: ReadStoreStreamForward(interfaces),
    subscribeToStoreStream: SubscribeToStoreStream(interfaces),

    // Stream queries
    catchUpStream: CatchUpStream(interfaces),
    readStreamForward: ReadStreamForward(interfaces),
    subscribeToStream: SubscribeToStream(interfaces),

    // Write Procedures
    writeToStream: WriteToStream(interfaces),
    writeToMultipleStreams: WriteToMultipleStreams(interfaces)
  }
}

export default GRPCImplementationFactory
