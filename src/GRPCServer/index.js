import grpc from 'grpc'

import { getProtocol } from '../Protocol'
import Implementation from './Implementation'

export default function GRPCServer ({
  port,
  credentials,
  eventsStream,
  onEventsStored,
  db,
  isStreamWritable
}) {
  let server = new grpc.Server()
  server.addProtoService(getProtocol().EventStore.service, Implementation({
    db,
    eventsStream,
    onEventsStored,
    isStreamWritable
  }))
  server.bind(`0.0.0.0:${port}`, credentials)
  server.start()
  return server
}
