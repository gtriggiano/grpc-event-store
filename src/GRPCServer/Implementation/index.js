import AppendEventsToMultipleStreams from './AppendEventsToMultipleStreams'
import AppendEventsToStream from './AppendEventsToStream'
import CatchUpWithStore from './CatchUpWithStore'
import CatchUpWithStream from './CatchUpWithStream'
import CatchUpWithStreamsCategory from './CatchUpWithStreamsCategory'
import GetUniqueId from './GetUniqueId'
import Ping from './Ping'
import ReadStoreForward from './ReadStoreForward'
import ReadStreamForward from './ReadStreamForward'
import ReadStreamsCategoryForward from './ReadStreamsCategoryForward'
import SubscribeToStore from './SubscribeToStore'
import SubscribeToStream from './SubscribeToStream'
import SubscribeToStreamsCategory from './SubscribeToStreamsCategory'

export default function RPCImplementation (config) {
  return {
    appendEventsToMultipleStreams: AppendEventsToMultipleStreams(config),
    appendEventsToStream: AppendEventsToStream(config),
    catchUpWithStore: CatchUpWithStore(config),
    catchUpWithStream: CatchUpWithStream(config),
    catchUpWithStreamsCategory: CatchUpWithStreamsCategory(config),
    getUniqueId: GetUniqueId(config),
    ping: Ping(config),
    readStoreForward: ReadStoreForward(config),
    readStreamForward: ReadStreamForward(config),
    readStreamsCategoryForward: ReadStreamsCategoryForward(config),
    subscribeToStore: SubscribeToStore(config),
    subscribeToStream: SubscribeToStream(config),
    subscribeToStreamsCategory: SubscribeToStreamsCategory(config)
  }
}
