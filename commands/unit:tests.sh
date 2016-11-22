#! /bin/bash

set -e

source "${BASH_SOURCE%/*}/common.sh"

echo
echo 'UNIT TESTS'
cleanContainers
echo 'Start tests'
echo
docker-compose -p $COMPOSE_PROJECT run development better-npm-run unit:tests
