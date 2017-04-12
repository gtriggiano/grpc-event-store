export default function SubscribeToStore ({
  eventsStream
}) {
  return (call) => {
    let onClientTermination = () => call.end()
    call.on('end', () => onClientTermination())

    call.once('data', () => {
      let subscription = eventsStream.subscribe(
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
