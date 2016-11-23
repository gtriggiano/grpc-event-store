import Rx from 'rxjs'

import { every, max } from 'lodash'

import { isValidString, eventsStreamFromBackendEmitter } from '../../utils'

function SubscribeToAggregateTypesStreamFromEvent ({backend, store}) {
  return (call) => {
    let onClientTermination = () => call.end()
    call.on('end', () => onClientTermination())

    call.once('data', (request) => {
      let { aggregateTypes, fromEventId } = request

      // Validate request
      if (!aggregateTypes.length) return call.emit('error', new TypeError('aggregateTypes should contain one or more non empty strings'))
      if (!every(aggregateTypes, isValidString)) return call.emit('error', new TypeError('aggregateTypes should be a list of non empty strings'))
      fromEventId = max([0, fromEventId])

      // Call backend
      let params = {aggregateTypes, fromEventId}
      let backendResults = backend.getEventsByAggregateTypes(params)
      let backendStream = eventsStreamFromBackendEmitter(backendResults)

      // Filter on store.eventsStream
      let liveStream = store.eventsStream
        .filter(({id, aggregateIdentity}) =>
          !!~aggregateTypes.indexOf(aggregateIdentity.type) &&
          id > fromEventId
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

export default SubscribeToAggregateTypesStreamFromEvent
