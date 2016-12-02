import Promise from 'bluebird'
import { range, flatten } from 'lodash'

import toDTO from '../helpers/eventRecordToDTO'

export default function storeStreamEvents (client, stream, actualVersionNumber, events, transactionId) {
  return new Promise((resolve, reject) => {
    let parametersList = events.map(({type, data}, idx) => ([
      stream,
      type,
      actualVersionNumber + idx + 1,
      new Buffer(data, 'utf8'),
      transactionId
    ]))

    let queryPlaceholders = parametersList.map(
      (parameters, idx) => {
        let placeholders = range(1, parameters.length + 1)
                            .map(n => n + (idx * parameters.length))
                            .map(n => `$${n}`)
        return `(${placeholders.join(', ')})`
      }
    )

    let insertQueryString = `
      INSERT INTO events
        (
          stream,
          type,
          versionNumber,
          data,
          transactionId
        )
      VALUES ${queryPlaceholders.join(', ')}
      RETURNING *`

    // Write events
    client.query(
      insertQueryString,
      flatten(parametersList),
      (err, result) => {
        if (err) return reject(err)
        resolve(result.rows.map(toDTO))
      }
    )
  })
}
