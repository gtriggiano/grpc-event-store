'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
function transactionBegin(client, done) {
  client.query('BEGIN; SAVEPOINT cockroach_restart', function (err) {
    return done(err);
  });
}
function transactionCommit(client, done) {
  client.query('COMMIT', function (err) {
    return done(err);
  });
}
function transactionRollback(client, done) {
  client.query('ROLLBACK', function (err) {
    return done(err);
  });
}
function transactionReleaseSavepoint(client, done) {
  client.query('RELEASE SAVEPOINT cockroach_restart', function (err) {
    return done(err);
  });
}
function transactionRollbackToSavepoint(client, done) {
  client.query('ROLLBACK TO SAVEPOINT cockroach_restart', function (err) {
    return done(err);
  });
}

function handleOperationError(client, err, cb) {
  if (err.code === '40001') {
    transactionRollbackToSavepoint(client, cb);
  } else {
    cb(err);
  }
}

function transactionWrapper(client, operation, done) {
  transactionBegin(client, function (err) {
    if (err) return done(err);

    var releasedTransaction = false;

    _attempt(_finalize);

    function _attempt(finalize) {
      operation(client, function (err, results) {
        if (err) return handleOperationError(client, err, finalize);

        transactionReleaseSavepoint(client, function (err) {
          if (err) return handleOperationError(client, err, finalize);

          releasedTransaction = true;
          finalize(null, results);
        });
      });
    }

    function _finalize(err, results) {
      if (err) {
        transactionRollback(client, function () {
          return done(err);
        });
      } else if (!releasedTransaction) {
        _attempt(_finalize);
      } else {
        transactionCommit(client, function (err) {
          if (err) return done(err);
          done(null, results);
        });
      }
    }
  });
}

exports.default = transactionWrapper;