import pg from 'pg'

export default function poolConnectionGetter (poolConfig) {
  let connectionsPool = new pg.Pool(poolConfig)

  return function getConnection (callback) {
    connectionsPool.connect((err, client, release) => {
      if (err) return callback(err)
      callback(null, {client, release})
    })
  }
}
