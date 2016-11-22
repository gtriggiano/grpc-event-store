#!/bin/bash

COMPOSE_PROJECT=grpceventstore

function cleanContainers () {
  echo
  echo -n 'Stopping and removing containers... '
  docker-compose -p $COMPOSE_PROJECT stop &>/dev/null
  docker-compose -p $COMPOSE_PROJECT rm -f &>/dev/null
  echo 'Done.'
  echo
}

function startCluster () {
  cleanContainers
  echo -n 'Starting CockroachDB instance... '
  docker-compose -p $COMPOSE_PROJECT up -d cockroach &>/dev/null
  sleep 2
  echo 'Done.'
  echo -n 'Creating eventstore database... '
  docker exec "${COMPOSE_PROJECT}_cockroach_1" ./cockroach sql -e "create database eventstore;" &>/dev/null
  echo 'Done.'
  echo
  echo -n 'Starting a cluster of 2 package nodes... '
  docker-compose -p $COMPOSE_PROJECT scale test-node=1 &>/dev/null
  sleep 1
  echo -n '(1) '
  docker-compose -p $COMPOSE_PROJECT scale test-node=2 &>/dev/null
  sleep 1
  echo -n '(2) '
  echo 'Done.'
  echo
}
