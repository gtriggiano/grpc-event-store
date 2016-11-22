#! /bin/bash

set -e

function doCleaning () {
  echo
  echo -n 'Stopping and removing containers... '
  npm run clean &>/dev/null
  echo 'Done.'
  echo
}

echo '---------------------------------------------------'
echo '==================================================='
echo ' grpc-event-store package tests'
echo '==================================================='
echo '---------------------------------------------------'
doCleaning
echo '==================================================='
echo
echo -n 'Transpiling tests with babel... '
npm run transpile:tests &>/dev/null
echo 'Done.'
doCleaning
echo '==================================================='
echo
echo -n 'Transpiling package with babel... '
npm run transpile:package &>/dev/null
echo 'Done.'
doCleaning
echo '==================================================='
echo
echo 'Unit tests'
echo
npm run unit:tests
doCleaning
echo '==================================================='
echo
echo 'CockroachDB Backend tests'
echo
echo -n 'Starting a CockroachDB instance... '
docker-compose up -d cockroach &>/dev/null
echo 'Done.'
echo -n 'Waiting 4 seconds for CockroachDB boot... '
sleep 4
echo 'Done.'
echo
npm run cockroach:backend:tests
doCleaning
echo '==================================================='
