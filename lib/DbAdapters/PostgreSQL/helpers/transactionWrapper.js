'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = transactionWrapper;
function transactionBegin(client, done) {
  client.query('BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE', err => done(err));
}
function transactionCommit(client, done) {
  client.query('COMMIT', err => done(err));
}
function transactionRollback(client, done) {
  client.query('ROLLBACK', err => done(err));
}
function handleOperationError(client, err, done) {
  if (err.code === '40001') {
    transactionRollback(client, done);
  } else {
    done(err);
  }
}

function transactionWrapper(client, operation, done) {
  transactionBegin(client, err => {
    if (err) return done(err);

    let retryOperation = true;

    _attempt(_finalize);

    function _attempt(finalize) {
      operation(client, (err, results) => {
        if (err) return handleOperationError(client, err, finalize);

        retryOperation = false;
        finalize(null, results);
      });
    }

    function _finalize(err, results) {
      if (err) {
        transactionRollback(client, () => done(err));
      } else if (retryOperation) {
        _attempt(_finalize);
      } else {
        transactionCommit(client, err => {
          if (err) return done(err);
          done(null, results);
        });
      }
    }
  });
}