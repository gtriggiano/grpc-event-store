"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = eventRecordToDTO;
function eventRecordToDTO(record) {
  let id = record.id,
      type = record.type,
      stream = record.stream,
      versionnumber = record.versionnumber,
      storedon = record.storedon,
      data = record.data,
      transactionid = record.transactionid;


  return {
    id,
    type,
    stream,
    versionNumber: parseInt(versionnumber, 10),
    storedOn: storedon.toISOString(),
    data,
    transactionId: transactionid
  };
}