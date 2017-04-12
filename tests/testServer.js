import { Node, CockroachDBAdapter } from '../src'

const server = Node({
  dbAdapter: CockroachDBAdapter({
    host: 'cockroachdb'
  })
})

server.on('start', () => console.log('Test server started'))
server.start()
