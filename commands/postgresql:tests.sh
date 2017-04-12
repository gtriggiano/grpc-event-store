#! /bin/bash

source "${BASH_SOURCE%/*}/common.sh"

echo -n "Preparing for PostgreSQL adapter tests... "
cleanService development &> /dev/null
setupPostgreSQLInstance &> /dev/null
echo "Done"

if [[ "$1" == "live" ]]; then
  CMD="LIB_FOLDER=src mocha --compilers js:babel-register -b -w tests/PostgreSQLAdapter/index"
else
  CMD="LIB_FOLDER=lib mocha lib-tests/PostgreSQLAdapter/index"
fi

runAsService development $CMD

echo -n "Cleaning after PostgreSQL adapter tests... "
cleanService development &> /dev/null
cleanPostgreSQLInstance &> /dev/null
echo "Done"
