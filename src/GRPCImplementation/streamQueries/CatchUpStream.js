import Rx from 'rxjs'
import { max } from 'lodash'

import { isValidString, eventsStreamFromBackendEmitter } from '../../utils'

function CatchUpStream ({backend, store}) {
  return (call) => {
    let onClientTermination = () => call.end()
    call.on('end', () => onClientTermination())

    call.once('data', (request) => {
      let { stream, fromVersionNumber } = request

      // Validate request
      if (!isValidString(stream)) return call.emit('error', new TypeError('stream should be a non empty string'))

      fromVersionNumber = max([0, fromVersionNumber])

      // Call backend
      let params = {stream, fromVersionNumber}
      let backendResults = backend.getEventsByStream(params)
      let backendStream = eventsStreamFromBackendEmitter(backendResults)

      // Filter on store.eventsStream
      let liveStream = store.eventsStream
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
      backendStream.toPromise().then(_endCachedLiveStream, _endCachedLiveStream)

      // Concat the streams and subscribe
      let eventsStream = backendStream.concat(cachedLiveStream, liveStream)
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

export default CatchUpStream
