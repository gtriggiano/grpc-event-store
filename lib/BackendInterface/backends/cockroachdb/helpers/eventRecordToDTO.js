"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
function eventRecordToDTO(record) {
  var id = record.id,
      stream = record.stream,
      type = record.type,
      versionNumber = record.versionNumber,
      stored = record.stored,
      data = record.data,
      transactionId = record.transactionId;


  return {
    id: id,
    stream: stream,
    type: type,
    versionNumber: parseInt(versionNumber, 10),
    stored: stored.toISOString(),
    data: data.toString(),
    transactionId: transactionId
  };
}

exports.default = eventRecordToDTO;