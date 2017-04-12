import {
  flatten
} from 'lodash'

import toDTO from '../helpers/eventRecordToDTO'

export default function appendEventsToStreams ({
  client,
  eventsTable,
  eventsToAppend,
  transactionId
}) {
  return new Promise((resolve, reject) => {
    let eventsParamsLists = eventsToAppend.map(({stream, type, data, versionNumber}) => ([
      stream,
      type,
      data,
      versionNumber,
      transactionId
    ]))

    let queryPlaceholders = eventsParamsLists.map((list, listIdx) => {
      let placeholders = list.map((_, itemIdx) => `$${(itemIdx + 1) + (listIdx * list.length)}`)
      return `(${placeholders.join(',')})`
    }).join(',')

    let queryString = `
      INSERT INTO ${eventsTable}
        (
          stream,
          type,
          data,
          versionNumber,
          transactionId
        )
      VALUES ${queryPlaceholders}
      RETURNING *
    `

    let queryParams = flatten(eventsParamsLists)

    client.query(queryString, queryParams, (err, result) => {
      if (err) return reject(err)
      resolve(result.rows.map(toDTO))
    })
  })
}
