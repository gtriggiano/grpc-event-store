#!/bin/bash

PKG_NAME=grpceventstore

function cleanContainers () {
  echo
  echo -n 'Stopping and removing all containers... '
  docker-compose -p $PKG_NAME stop &>/dev/null
  docker-compose -p $PKG_NAME rm -f &>/dev/null
  echo 'Done.'
  echo
}

function cleanService () {
  local SERVICE=$1
  if [[ -n "$SERVICE" ]]; then
    echo
    echo -n "Stopping and removing all '$SERVICE' containers... "
    docker-compose -p $PKG_NAME stop $SERVICE &>/dev/null
    docker-compose -p $PKG_NAME rm -f $SERVICE &>/dev/null
    echo 'Done.'
    echo
  fi
}

function startService () {
  local SERVICE=$1
  if [[ -n "$SERVICE" ]]; then
    echo
    echo -n "Starting service '$SERVICE'... "
    docker-compose -p $PKG_NAME up -d $SERVICE &>/dev/null
    echo 'Done.'
    echo
  fi
}

function stopService () {
  local SERVICE=$1
  if [[ -n "$SERVICE" ]]; then
    echo
    echo -n "Stopping all '$SERVICE' containers... "
    docker-compose -p $PKG_NAME stop $SERVICE &>/dev/null
    echo 'Done.'
    echo
  fi
}

function runAsService () {
  local SERVICE=$1
  shift
  local CMD=$@
  if [[ -n "$SERVICE" && -n "$CMD"  ]]; then
    docker-compose -p $PKG_NAME run $SERVICE bash -c "$CMD"
  fi
}

function cleanCockroachDbInstance () {
  cleanService cockroachdb &> /dev/null
}

function setupCockroachDbInstance () {
  cleanCockroachDbInstance &> /dev/null
  startService cockroachdb &> /dev/null
  sleep 2
  docker exec "${PKG_NAME}_cockroachdb_1" ./cockroach sql -e "CREATE DATABASE eventstore;" &> /dev/null
  CREATE_TABLE_SQL=$(cat ${BASH_SOURCE%/*}/../src/DbAdapters/CockroachDB/createTable.sql)
  docker exec "${PKG_NAME}_cockroachdb_1" ./cockroach sql -d eventstore -e "$CREATE_TABLE_SQL" &> /dev/null
}

function cleanPostgreSQLInstance () {
  cleanService postgresql &> /dev/null
}

function setupPostgreSQLInstance () {
  cleanPostgreSQLInstance &> /dev/null
  startService postgresql &> /dev/null
  sleep 2
}

function cleanTestServer () {
  cleanService testServer &> /dev/null
}

function startTestServer () {
  cleanTestServer &> /dev/null
  startService testServer &> /dev/null
}

function separator () {
  echo "================================================="
}
