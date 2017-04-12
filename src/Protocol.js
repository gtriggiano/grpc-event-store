import path from 'path'
import grpc from 'grpc'

export const PROTOCOL_FILE_PATH = path.resolve(__dirname, '..', 'GRPCEventStore.proto')

export const getProtocol = () => grpc.load(PROTOCOL_FILE_PATH).grpceventstore
