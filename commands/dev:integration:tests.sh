#! /bin/bash

set -e

echo -n 'Cleanind containers... '
npm run clean &>/dev/null
echo 'Done.'
echo
echo -n 'Starting CockroachDB instance... '
docker-compose -p integration up -d cockroach &>/dev/null
sleep 4
echo 'Done.'
echo
echo -n 'Starting a cluster of 3 package nodes... '
docker-compose -p integration scale test-node=1 &>/dev/null
sleep2
echo -n '(1) '
docker-compose -p integration scale test-node=2 &>/dev/null
sleep2
echo -n '(2) '
docker-compose -p integration scale test-node=3 &>/dev/null
sleep2
echo -n '(3) '
sleep3
echo 'Done.'
echo
echo 'Starting integration tests'
docker-compose -p integration run development better-npm-run cockroach:backend:tests:live
