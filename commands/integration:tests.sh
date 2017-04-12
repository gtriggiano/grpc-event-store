#! /bin/bash

source "${BASH_SOURCE%/*}/common.sh"

echo -n "Preparing for package integration tests... "
setupCockroachDbInstance &> /dev/null
startTestServer &> /dev/null
echo "Done"

if [[ "$1" == "live" ]]; then
  CMD="LIB_FOLDER=src mocha --compilers js:babel-register -b -w tests/integration"
else
  CMD="LIB_FOLDER=lib mocha lib-tests/integration"
fi

runAsService development $CMD

echo -n "Cleaning after package integration tests... "
cleanService development &> /dev/null
cleanCockroachDbInstance &> /dev/null
cleanTestServer &> /dev/null
echo "Done"
