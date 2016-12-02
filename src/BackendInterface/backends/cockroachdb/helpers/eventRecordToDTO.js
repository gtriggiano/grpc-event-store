function eventRecordToDTO (record) {
  let {
    id,
    stream,
    type,
    versionNumber,
    stored,
    data,
    transactionId
  } = record

  return {
    id,
    stream,
    type,
    versionNumber: parseInt(versionNumber, 10),
    stored: stored.toISOString(),
    data: data.toString(),
    transactionId
  }
}

export default eventRecordToDTO
