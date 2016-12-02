CREATE TABLE IF NOT EXISTS events (
  id BIGSERIAL,
  stream STRING(256) NOT NULL,
  type STRING(256) NOT NULL,
  versionNumber INT NOT NULL CHECK (versionNumber >= 0),
  stored TIMESTAMP NOT NULL DEFAULT NOW(),
  data BYTES NOT NULL,
  transactionId STRING(256) NOT NULL,

  PRIMARY KEY (stream, versionNumber),
  INDEX by_id_idx (id),
  INDEX by_type_idx (type),
  INDEX by_stream_idx (stream),
  INDEX by_storageDate_idx (stored),
  INDEX by_transaction_id_idx (transactionId)
);
