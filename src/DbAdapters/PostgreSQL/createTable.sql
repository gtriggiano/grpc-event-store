CREATE TABLE IF NOT EXISTS events (
  id BIGSERIAL,
  stream VARCHAR(256) NOT NULL,
  type VARCHAR(256) NOT NULL,
  versionnumber INT NOT NULL CHECK (versionnumber > 0),
  storedon TIMESTAMP NOT NULL DEFAULT NOW(),
  data TEXT NOT NULL,
  transactionid VARCHAR(36) NOT NULL,

  PRIMARY KEY (stream, versionnumber)
);

CREATE UNIQUE INDEX IF NOT EXISTS by_id_idx ON events (id);
CREATE INDEX IF NOT EXISTS by_type_idx ON events (type);
CREATE INDEX IF NOT EXISTS by_stream_idx ON events (stream);
CREATE INDEX IF NOT EXISTS by_storedon_idx ON events (storedon);
CREATE INDEX IF NOT EXISTS by_transactionid_idx ON events (transactionid);
