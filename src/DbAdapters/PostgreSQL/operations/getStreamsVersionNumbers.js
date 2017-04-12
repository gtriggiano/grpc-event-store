export default function getStreamsVersionNumbers ({
  client,
  eventsTable,
  streams
}) {
  return new Promise((resolve, reject) => {
    let queryString = `
      SELECT stream, count(stream) AS version FROM ${eventsTable}
      WHERE stream IN (${streams.map((_, idx) => `$${idx + 1}`).join(',')})
      GROUP BY stream
    `

    client.query(queryString, streams, (err, result) => {
      if (err) return reject(err)
      let streamsVersionsMap = result.rows.reduce((map, row) => ({
        ...map,
        [row.stream]: parseInt(row.version, 10)
      }), {})

      streams.forEach(stream => {
        streamsVersionsMap[stream] = streamsVersionsMap[stream] || 0
      })

      resolve(streamsVersionsMap)
    })
  })
}
