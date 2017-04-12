#! /bin/bash

source "${BASH_SOURCE%/*}/common.sh"

echo -n "Preparing for package unit tests... "
cleanService development &> /dev/null
echo "Done"

if [[ "$1" == "live" ]]; then
  CMD="LIB_FOLDER=src mocha --compilers js:babel-register -b -w tests/unit"
else
  CMD="LIB_FOLDER=lib mocha lib-tests/unit"
fi

runAsService development $CMD

echo -n "Cleaning after package unit tests... "
cleanService development &> /dev/null
echo "Done"
