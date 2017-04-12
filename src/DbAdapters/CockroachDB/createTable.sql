CREATE TABLE IF NOT EXISTS events (
  id BIGSERIAL,
  stream VARCHAR(256) NOT NULL,
  type VARCHAR(256) NOT NULL,
  versionnumber INT NOT NULL CHECK (versionnumber > 0),
  storedon TIMESTAMP NOT NULL DEFAULT NOW(),
  data TEXT NOT NULL,
  transactionid VARCHAR(36) NOT NULL,

  PRIMARY KEY (stream, versionnumber),
  INDEX by_id_idx (id),
  INDEX by_type_idx (type),
  INDEX by_stream_idx (stream),
  INDEX by_storageDate_idx (storedon),
  INDEX by_transactionId_idx (transactionid)
);
