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
    id: parseInt(id, 10),
    type,
    aggregateIdentity: {
      id: aggregateId,
      type: aggregateType
    },
    storedOn: storedOn.toISOString(),
    sequenceNumber: parseInt(sequenceNumber, 10),
    data: data.toString(),
    metadata: metadata.toString(),
    transactionId
  }
}

export default eventRecordToDTO
