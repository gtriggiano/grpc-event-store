import Rx from 'rxjs/Rx'
import {
  max
} from 'lodash'

import { eventsStreamFromDbEmitter } from '../../utils'

export default function CatchUpWithStore ({
  db,
  eventsStream
}) {
  return (call) => {
    let onClientTermination = () => call.end()
    call.on('end', () => onClientTermination())

    call.once('data', (request) => {
      let {fromEventId} = request
      fromEventId = max([0, fromEventId])

      // Call backend
      let params = {fromEventId}
      let dbResults = db.getEvents(params)
      let dbStream = eventsStreamFromDbEmitter(dbResults)

      // Cache live events until backendStream ends
      let cachedLiveStream = new Rx.ReplaySubject()
      let cachedLiveStreamSubscription = eventsStream.subscribe(e => cachedLiveStream.next(e))
      function _endCachedLiveStream () {
        cachedLiveStreamSubscription.unsubscribe()
        cachedLiveStream.complete()

        // release memory
        process.nextTick(() => cachedLiveStream._events.splice(0))
      }
      dbStream.toPromise().then(_endCachedLiveStream, _endCachedLiveStream)

      // Concat the streams and subscribe
      let finalStream = dbStream.concat(cachedLiveStream, eventsStream)
      let finalStreamSubscription = finalStream.subscribe(
        evt => call.write(evt),
        err => call.emit('error', err)
      )

      onClientTermination = () => {
        _endCachedLiveStream()
        finalStreamSubscription.unsubscribe()
        call.end()
      }
    })
  }
}
