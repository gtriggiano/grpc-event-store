#! /bin/bash

source "${BASH_SOURCE%/*}/common.sh"

echo -n "Preparing for CockroachDB adapter tests... "
cleanService development &> /dev/null
setupCockroachDbInstance &> /dev/null
echo "Done"

if [[ "$1" == "live" ]]; then
  CMD="LIB_FOLDER=src mocha --compilers js:babel-register -b -w tests/CockroachDBAdapter/index"
else
  CMD="LIB_FOLDER=lib mocha lib-tests/CockroachDBAdapter/index"
fi

runAsService development $CMD

echo -n "Cleaning after CockroachDB adapter tests... "
cleanService development &> /dev/null
cleanCockroachDbInstance &> /dev/null
echo "Done"
