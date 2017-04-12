CREATE TABLE IF NOT EXISTS events (
  id BIGSERIAL,
  stream VARCHAR(256) NOT NULL,
  type VARCHAR(256) NOT NULL,
  versionNumber INT NOT NULL CHECK (versionNumber > 0),
  storedOn TIMESTAMP NOT NULL DEFAULT NOW(),
  data TEXT NOT NULL,
  transactionId VARCHAR(36) NOT NULL,

  PRIMARY KEY (stream, versionNumber),
  INDEX by_id_idx (id),
  INDEX by_type_idx (type),
  INDEX by_stream_idx (stream),
  INDEX by_storageDate_idx (storedOn),
  INDEX by_transactionId_idx (transactionId)
);
