function eventRecordToDTO (record) {
  let {
    id,
    type,
    aggregateId,
    aggregateType,
    storedOn,
    sequenceNumber,
    data,
    metadata,
    transactionId
  } = record

  return {
    id,
    aggregateIdentity: {
      id: aggregateId,
      type: aggregateType
    },
    type,
    storedOn: storedOn.toISOString(),
    sequenceNumber: parseInt(sequenceNumber, 10),
    data: data.toString(),
    metadata: metadata.toString(),
    transactionId
  }
}

export default eventRecordToDTO
