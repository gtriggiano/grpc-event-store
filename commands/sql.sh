#! /bin/bash

set -e

source "${BASH_SOURCE%/*}/common.sh"

docker-compose -p $COMPOSE_PROJECT up -d cockroach &>/dev/null
docker exec -it "${COMPOSE_PROJECT}_cockroach_1" ./cockroach sql
