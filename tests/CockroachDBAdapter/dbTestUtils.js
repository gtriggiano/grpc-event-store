import pg from 'pg'
import shortid from 'shortid'
import {
  range,
  sample
} from 'lodash'

const pool = new pg.Pool({
  host: 'cockroachdb',
  port: 26257,
  database: 'eventstore',
  user: 'root'
})

const libFolder = `../../${process.env.LIB_FOLDER}`
const CockroachDBAdapter = require(`${libFolder}/DbAdapters/CockroachDB`).default

const eventTypes = range(1, 6).map(n => `SomethingHappened${n}`)

export const streams = [1, 2].map((n) => {
  let category = n % 2 ? 'odd-stream' : 'even-stream'
  return {
    name: `${category}::${n}`,
    category: category,
    version: 0
  }
})

export const events = range(1, 30).map(n => {
  let stream = sample(streams)
  stream.version++
  let eventType = sample(eventTypes)

  let event = {
    id: 1000 + n,
    type: eventType,
    stream: stream.name,
    versionNumber: stream.version,
    data: `data${n}`,
    transactionId: shortid()
  }

  return event
})

export const createEventsTable = () => new Promise((resolve, reject) => {
  pool.connect((err, client, release) => {
    if (err) return reject(err)
    client.query(CockroachDBAdapter.createTableSQL(), (err) => {
      release()
      if (err) return reject(err)
      resolve()
    })
  })
})

export const truncateEventsTable = () => new Promise((resolve, reject) => {
  pool.connect((err, client, release) => {
    if (err) return reject(err)

    client.query(`TRUNCATE events`, (err) => {
      release()
      if (err) return reject(err)
      resolve()
    })
  })
})

export const populateEventsTable = () => events.reduce(
  (prevQuery, event) => {
    let {id, stream, type, versionNumber, data, transactionId} = event
    return prevQuery.then(() => new Promise((resolve, reject) => {
      pool.connect((err, client, release) => {
        if (err) return reject(err)
        let queryString = `
          INSERT INTO events
            (id, stream, type, versionNumber, data, transactionId)
            VALUES ($1, $2, $3, $4, $5, $6)
        `
        let queryParams = [id, stream, type, versionNumber, new Buffer(data, 'utf8'), transactionId]
        client.query(queryString, queryParams, (err) => {
          release()
          if (err) return reject(err)
          resolve()
        })
      })
    }))
  },
  Promise.resolve()
)

export const getDbStreams = () => new Promise((resolve, reject) => {
  pool.connect((err, client, release) => {
    if (err) return reject(err)
    let queryString = `
      SELECT DISTINCT stream FROM events
    `
    client.query(queryString, (err, result) => {
      release()
      if (err) return reject(err)
      resolve(result.rows.map(({stream}) => stream))
    })
  })
})

export const getEventsCount = () => new Promise((resolve, reject) => {
  pool.connect((err, client, release) => {
    if (err) return reject(err)
    let queryString = `
      SELECT COUNT(*) AS totalEvents FROM events
    `
    client.query(queryString, (err, result) => {
      release()
      if (err) return reject(err)
      resolve(result.rows[0].totalEvents)
    })
  })
})
