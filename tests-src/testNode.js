import { ServiceNode } from '../src'

const serviceNode = ServiceNode({
  host: 'test-node',
  backend: {
    type: 'cockroachdb',
    host: 'cockroach',
    port: 26257,
    database: 'eventstore',
    user: 'root'
  }
})

serviceNode.connect()
serviceNode.on('connect', () => console.log('Connected.'))
