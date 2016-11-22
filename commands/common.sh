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
