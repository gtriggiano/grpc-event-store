#! /bin/bash

set -e

source "${BASH_SOURCE%/*}/common.sh"

echo
echo 'COCKROACH BACKEND TESTS'
cleanContainers
echo -n 'Starting CockroachDB instance... '
docker-compose -p $COMPOSE_PROJECT up -d cockroach &>/dev/null
sleep 4
echo 'Done.'
echo
echo 'Start tests'
echo
docker-compose -p $COMPOSE_PROJECT run development better-npm-run cockroach:backend:tests
