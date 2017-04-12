#! /bin/bash

set -e

source "${BASH_SOURCE%/*}/common.sh"

echo
echo -n "Transpiling package... "
runAsService development "rm -rf lib/*" &> /dev/null
runAsService development "babel src -D -d lib" &> /dev/null
echo "Done."
echo -n "Transpiling tests... "
runAsService development "rm -rf lib-tests/*" &> /dev/null
runAsService development "babel tests -D -d lib-tests" &> /dev/null
echo "Done."
