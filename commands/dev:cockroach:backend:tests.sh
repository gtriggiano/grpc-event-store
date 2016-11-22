#! /bin/bash

set -e

source "${BASH_SOURCE%/*}/common.sh"

cleanContainers
echo
echo -n 'Starting CockroachDB instance... '
docker-compose -p $COMPOSE_PROJECT up -d cockroach &>/dev/null
sleep 4
echo 'Done.'
echo
echo 'Start CockroachDB backend tests'
docker-compose -p $COMPOSE_PROJECT run development better-npm-run cockroach:backend:tests:live
