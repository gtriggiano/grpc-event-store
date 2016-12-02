import { isValidString } from '../../utils'

function SubscribeToStream ({store}) {
  return (call) => {
    let onClientTermination = () => call.end()
    call.on('end', () => onClientTermination())

    call.once('data', (request) => {
      let { stream } = request

      // Validate request
      if (!isValidString(stream)) return call.emit('error', new TypeError('stream should be a non empty string'))

      let subscription = store.eventsStream
        .filter((event) => event.stream === stream)
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

export default SubscribeToStream
