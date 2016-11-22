#! /bin/bash

set -e

source "${BASH_SOURCE%/*}/common.sh"

echo -n 'Transpiling tests with babel... '
docker-compose -p $COMPOSE_PROJECT run development better-npm-run transpile:tests &>/dev/null
echo 'Done.'
