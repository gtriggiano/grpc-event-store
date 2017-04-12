import { isNotEmptyString } from '../../utils'

export default function SubscribeToStream ({
  eventsStream
}) {
  return (call) => {
    let onClientTermination = () => call.end()
    call.on('end', () => onClientTermination())

    call.once('data', (request) => {
      let { stream } = request

      // Validate request
      if (!isNotEmptyString(stream)) return call.emit('error', new TypeError('stream should be a non empty string'))

      let subscription = eventsStream
        .filter((event) => event.stream === stream)
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
