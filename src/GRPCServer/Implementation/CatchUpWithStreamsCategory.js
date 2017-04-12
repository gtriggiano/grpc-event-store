import Rx from 'rxjs/Rx'
import {
  max
} from 'lodash'

import { isNotEmptyString, eventsStreamFromDbEmitter } from '../../utils'

export default function CatchUpWithStreamsCategory ({
  db,
  eventsStream
}) {
  return (call) => {
    let onClientTermination = () => call.end()
    call.on('end', () => onClientTermination())

    call.once('data', (request) => {
      let { streamsCategory, fromEventId } = request

      // Validate request
      if (!isNotEmptyString(streamsCategory)) return call.emit('error', new TypeError('streamsCategory should be a non empty string'))

      fromEventId = max([0, fromEventId])

      // Call backend
      let dbResults = db.getEventsByStreamsCategory({streamsCategory, fromEventId})
      let dbStream = eventsStreamFromDbEmitter(dbResults)

      // Filter on eventsStream
      let liveStream = eventsStream.filter(({id, stream}) =>
        stream.split('::')[0] === streamsCategory && id > fromEventId
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
