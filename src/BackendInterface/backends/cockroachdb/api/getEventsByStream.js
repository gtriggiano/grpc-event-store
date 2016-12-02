import EventEmitter from 'eventemitter3'

import toDTO from '../helpers/eventRecordToDTO'

function getEventsByStreamFactory (getConnection) {
  return ({stream, fromVersionNumber, limit}) => {
    let queryStr = `SELECT * FROM events
                    WHERE stream = $1
                      AND versionNumber > $2
                    ORDER BY id `

    let queryParams = [
      stream,
      fromVersionNumber
    ]

    if (limit) {
      queryStr += 'LIMIT $3'
      queryParams.push(limit)
    }

    let results = new EventEmitter()

    getConnection((err, {client, release}) => {
      if (err) return results.emit('error', err)

      let query = client.query(queryStr, queryParams)

      query.on('row', row => results.emit('event', toDTO(row)))
      query.on('error', err => {
        results.emit('error', err)
        query.removeAllListeners()
        release()
      })
      query.on('end', () => {
        results.emit('end')
        query.removeAllListeners()
        release()
      })
    })

    return results
  }
}

export default getEventsByStreamFactory
