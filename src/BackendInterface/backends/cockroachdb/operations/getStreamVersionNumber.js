import Promise from 'bluebird'

export default function getStreamVersionNumber (client, stream) {
  return new Promise((resolve, reject) => {
    client.query(
      `SELECT COUNT(*) AS versionNumber FROM events
       WHERE stream = $1`,
       [stream],
       (err, result) => {
         if (err) return reject(err)
         let { versionNumber } = result.rows[0]
         resolve(parseInt(versionNumber, 10))
       }
    )
  })
}
