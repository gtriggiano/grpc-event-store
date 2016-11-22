#! /bin/bash

set -e

source "${BASH_SOURCE%/*}/common.sh"

cleanContainers
echo
echo 'Start unit tests'
docker-compose -p $COMPOSE_PROJECT run development better-npm-run unit:tests:live
