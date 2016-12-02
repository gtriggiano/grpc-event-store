import Rx from 'rxjs'
import { max } from 'lodash'

import { eventsStreamFromBackendEmitter } from '../../utils'

function CatchUpStoreStream ({backend, store}) {
  return (call) => {
    let onClientTermination = () => call.end()
    call.on('end', () => onClientTermination())

    call.once('data', (request) => {
      let {fromEventId} = request
      fromEventId = max([0, fromEventId])

      // Call backend
      let params = {fromEventId}
      let backendResults = backend.getEvents(params)
      let backendStream = eventsStreamFromBackendEmitter(backendResults)

      // Cache live events until backendStream ends
      let cachedLiveStream = new Rx.ReplaySubject()
      let cachedLiveStreamSubscription = store.eventsStream.subscribe(e => cachedLiveStream.next(e))
      function _endCachedLiveStream () {
        cachedLiveStreamSubscription.unsubscribe()
        cachedLiveStream.complete()

        // release memory
        process.nextTick(() => cachedLiveStream._events.splice(0))
      }
      backendStream.toPromise().then(_endCachedLiveStream, _endCachedLiveStream)

      // Concat the streams and subscribe
      let eventsStream = backendStream.concat(cachedLiveStream, store.eventsStream)
      let eventsStreamSubscription = eventsStream.subscribe(
        evt => call.write(evt),
        err => call.emit('error', err)
      )

      onClientTermination = () => {
        _endCachedLiveStream()
        eventsStreamSubscription.unsubscribe()
        call.end()
      }
    })
  }
}

export default CatchUpStoreStream
