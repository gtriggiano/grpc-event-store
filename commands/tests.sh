#! /bin/bash

set -e

source "${BASH_SOURCE%/*}/unit:tests.sh"
echo
echo
source "${BASH_SOURCE%/*}/inmemorydb:tests.sh"
echo
echo
source "${BASH_SOURCE%/*}/cockroachdb:tests.sh"
echo
echo
source "${BASH_SOURCE%/*}/postgresql:tests.sh"
echo
echo
source "${BASH_SOURCE%/*}/integration:tests.sh"
