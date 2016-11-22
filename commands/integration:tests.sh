#! /bin/bash

set -e

source "${BASH_SOURCE%/*}/common.sh"

echo
echo 'INTEGRATION TESTS'
startCluster
echo 'Start tests'
echo
docker-compose -p $COMPOSE_PROJECT run development sh -c "WRITER_HOST=${COMPOSE_PROJECT}_test-node_1 SUBSCRIBER_HOST=${COMPOSE_PROJECT}_test-node_2 better-npm-run integration:tests"
