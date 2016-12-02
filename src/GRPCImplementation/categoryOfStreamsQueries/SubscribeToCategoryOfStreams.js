import { isValidString } from '../../utils'

function SubscribeToCategoryOfStreams ({store}) {
  return (call) => {
    let onClientTermination = () => call.end()
    call.on('end', () => onClientTermination())

    call.once('data', (request) => {
      let { streamsCategory } = request

      // Validate request
      if (!isValidString(streamsCategory)) return call.emit('error', new TypeError('streamsCategory should be a non empty string'))

      let subscription = store.eventsStream
        .filter(({stream}) => stream.split('-')[0] === streamsCategory)
        .subscribe(
          evt => call.write(evt),
          err => call.emit('error', err)
        )

      onClientTermination = () => {
        subscription.unsubscribe()
        call.end()
      }
    })
  }
}

export default SubscribeToCategoryOfStreams
