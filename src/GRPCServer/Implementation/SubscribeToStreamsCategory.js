import { isNotEmptyString } from '../../utils'

export default function SubscribeToStreamsCategory ({
  eventsStream
}) {
  return (call) => {
    let onClientTermination = () => call.end()
    call.on('end', () => onClientTermination())

    call.once('data', (request) => {
      let { streamsCategory } = request

      // Validate request
      if (!isNotEmptyString(streamsCategory)) return call.emit('error', new TypeError('streamsCategory should be a non empty string'))

      let subscription = eventsStream
        .filter(({stream}) => stream.split('::')[0] === streamsCategory)
        .subscribe(
          event => call.write(event),
          err => call.emit('error', err)
        )

      onClientTermination = () => {
        subscription.unsubscribe()
        call.end()
      }
    })
  }
}
