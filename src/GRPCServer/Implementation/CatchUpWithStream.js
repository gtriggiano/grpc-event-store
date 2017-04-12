import Rx from 'rxjs/Rx'
import {
  max
} from 'lodash'

import { isNotEmptyString, eventsStreamFromDbEmitter } from '../../utils'

export default function CatchUpWithStream ({
  db,
  eventsStream
}) {
  return (call) => {
    let onClientTermination = () => call.end()
    call.on('end', () => onClientTermination())

    call.once('data', (request) => {
      let { stream, fromVersionNumber } = request

      // Validate request
      if (!isNotEmptyString(stream)) return call.emit('error', new TypeError('stream should be a non empty string'))

      fromVersionNumber = max([0, fromVersionNumber])

      // Call backend
      let params = {stream, fromVersionNumber}
      let dbResults = db.getEventsByStream(params)
      let dbStream = eventsStreamFromDbEmitter(dbResults)

      // Filter on store.eventsStream
      let liveStream = eventsStream
        .filter((event) =>
          event.stream === stream &&
          event.versionNumber > fromVersionNumber
        )

      // Cache live events until backendStream ends
      let cachedLiveStream = new Rx.ReplaySubject()
      let cachedLiveStreamSubscription = liveStream.subscribe(e => cachedLiveStream.next(e))
      function _endCachedLiveStream () {
        cachedLiveStreamSubscription.unsubscribe()
        cachedLiveStream.complete()
        // release memory
        process.nextTick(() => cachedLiveStream._events.splice(0))
      }
      dbStream.toPromise().then(_endCachedLiveStream, _endCachedLiveStream)

      // Concat the streams and subscribe
      let finalStream = dbStream.concat(cachedLiveStream, liveStream)
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
