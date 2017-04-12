export default function eventRecordToDTO (record) {
  let {
    id,
    type,
    stream,
    versionNumber,
    storedOn,
    data,
    transactionId
  } = record

  return {
    id,
    type,
    stream,
    versionNumber: parseInt(versionNumber, 10),
    storedOn: storedOn.toISOString(),
    data,
    transactionId
  }
}
