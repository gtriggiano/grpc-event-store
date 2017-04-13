import fs from 'fs'
import path from 'path'
import shortid from 'shortid'
import {
  range,
  sample
} from 'lodash'

let now = Date.now()

const EVENTS_FILE = path.resolve(__dirname, 'events.json')

const eventTypes = range(1, 6).map(n => `SomethingHappened${n}`)

const streams = [1, 2, 3].map((n) => {
  let category = n % 2 ? 'odd-stream' : 'even-stream'
  return {
    name: `${category}::${n}`,
    category: category,
    version: 0
  }
})

const events = range(1, 50).map(n => {
  let stream = sample(streams)
  stream.version++
  let eventType = sample(eventTypes)

  let event = {
    id: n,
    type: eventType,
    stream: stream.name,
    storedOn: (new Date(now + (n * 1000))).toISOString(),
    versionNumber: stream.version,
    data: `data${n}`,
    transactionId: shortid()
  }

  return event
})

let eventsString = JSON.stringify(events, null, 2)
fs.writeFileSync(EVENTS_FILE, eventsString)
