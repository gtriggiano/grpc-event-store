#! /bin/bash

source "${BASH_SOURCE%/*}/common.sh"

echo -n "Preparing for InMemoryDB adapter tests... "
cleanService development &> /dev/null
echo "Done"

if [[ "$1" == "live" ]]; then
  CMD="LIB_FOLDER=src mocha --compilers js:babel-register -b -w tests/InMemoryAdapter/index"
else
  CMD="LIB_FOLDER=lib mocha lib-tests/InMemoryAdapter/index"
fi

runAsService development $CMD

echo -n "Cleaning after InMemoryDB adapter tests... "
cleanService development &> /dev/null
echo "Done"
