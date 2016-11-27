CREATE TABLE IF NOT EXISTS aggregates (
  id STRING(256) UNIQUE NOT NULL,
  type STRING(256) NOT NULL,
  version INT NOT NULL CHECK (version >= -1),

  PRIMARY KEY (id, type),
  INDEX by_type_idx (type)
);

CREATE TABLE IF NOT EXISTS events (
  id INT UNIQUE DEFAULT UNIQUE_ROWID(),
  aggregateType STRING(256) NOT NULL,
  aggregateId STRING(256) NOT NULL,
  type STRING(256) NOT NULL,
  sequenceNumber INT NOT NULL CHECK (sequenceNumber >= 0),
  storedOn TIMESTAMP NOT NULL DEFAULT NOW(),
  data BYTES NOT NULL,
  metadata BYTES NOT NULL,
  transactionId STRING(256) NOT NULL,

  PRIMARY KEY (aggregateId, aggregateType, sequenceNumber),
  FOREIGN KEY (aggregateId, aggregateType) REFERENCES aggregates (id, type),
  INDEX by_type_idx (type),
  INDEX by_aggregate_type_idx (aggregateType),
  INDEX by_storageDate_idx (storedOn),
  INDEX by_transaction_id_idx (transactionId)
);

CREATE TABLE IF NOT EXISTS snapshots (
  aggregateId STRING(256) NOT NULL,
  aggregateType STRING(256) NOT NULL,
  version INT CHECK (version >= 0),
  data BYTES NOT NULL,

  PRIMARY KEY (aggregateId, aggregateType, version),
  FOREIGN KEY (aggregateId, aggregateType) REFERENCES aggregates (id, type)
);
