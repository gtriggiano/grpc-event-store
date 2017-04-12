export default function eventRecordToDTO (record) {
  let {
    id,
    type,
    stream,
    versionnumber,
    storedon,
    data,
    transactionid
  } = record

  return {
    id,
    type,
    stream,
    versionNumber: parseInt(versionnumber, 10),
    storedOn: storedon.toISOString(),
    data,
    transactionId: transactionid
  }
}
