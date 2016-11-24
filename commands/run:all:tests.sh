#! /bin/bash

set -e

source "${BASH_SOURCE%/*}/common.sh"

echo '---------------------------------------------------'
echo '==================================================='
echo ' grpc-event-store package tests'
echo '==================================================='
echo '---------------------------------------------------'
echo
echo '==================================================='
source "${BASH_SOURCE%/*}/transpile:tests.sh"
echo '==================================================='
source "${BASH_SOURCE%/*}/transpile:package.sh"
echo '==================================================='
source "${BASH_SOURCE%/*}/unit:tests.sh"
echo '==================================================='
source "${BASH_SOURCE%/*}/cockroach:backend:tests.sh"
echo '==================================================='
# source "${BASH_SOURCE%/*}/integration:tests.sh"
echo '==================================================='
