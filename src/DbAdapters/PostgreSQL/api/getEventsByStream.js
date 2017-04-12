import EventEmitter from 'eventemitter3'

import toDTO from '../helpers/eventRecordToDTO'

export default function getEventsByStreamHOF (getConnection, eventsTable) {
  return ({stream, fromVersionNumber, limit}) => {
    let queryString = `SELECT * FROM ${eventsTable}
                        WHERE stream = $1
                        AND versionNumber > $2
                        ORDER BY id`

    let queryParams = [
      stream,
      fromVersionNumber
    ]

    if (limit) {
      queryString = `${queryString} LIMIT $3`
      queryParams.push(limit)
    }

    let dbResults = new EventEmitter()

    getConnection((err, {client, release} = {}) => {
      if (err) return dbResults.emit('error', err)

      let query = client.query(queryString, queryParams)

      query.on('row', row => dbResults.emit('event', toDTO(row)))
      query.on('error', err => {
        dbResults.emit('error', err)
        query.removeAllListeners()
        release()
      })
      query.on('end', () => {
        dbResults.emit('end')
        query.removeAllListeners()
        release()
      })
    })

    return dbResults
  }
}
