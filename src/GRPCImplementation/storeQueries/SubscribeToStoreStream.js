function SubscribeToStoreStream ({store}) {
  return (call) => {
    let onClientTermination = () => call.end()
    call.on('end', () => onClientTermination())

    call.once('data', () => {
      let subscription = store.eventsStream.subscribe(evt => call.write(evt))

      onClientTermination = () => {
        subscription.unsubscribe()
        call.end()
      }
    })
  }
}

export default SubscribeToStoreStream
