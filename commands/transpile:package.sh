#! /bin/bash

set -e

source "${BASH_SOURCE%/*}/common.sh"

echo -n 'Transpiling package with babel... '
docker-compose -p $COMPOSE_PROJECT run development better-npm-run transpile:package &>/dev/null
echo 'Done.'
