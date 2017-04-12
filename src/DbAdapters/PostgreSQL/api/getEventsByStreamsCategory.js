import EventEmitter from 'eventemitter3'

import toDTO from '../helpers/eventRecordToDTO'

export default function getEventsByStreamsCategoryHOF (getConnection, eventsTable) {
  return ({streamsCategory, fromEventId, limit}) => {
    let queryString = `SELECT * FROM ${eventsTable}
                        WHERE id > $1
                        AND (stream = $2 OR stream LIKE $3)
                        ORDER BY id`
    let queryParams = [
      fromEventId,
      streamsCategory,
      `${streamsCategory}::%`
    ]

    if (limit) {
      queryString = `${queryString} LIMIT $4`
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
