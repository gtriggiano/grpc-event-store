#!/bin/bash

PKG_NAME=grpceventstore

function cleanContainers () {
  echo -n 'Stopping and removing all containers... '
  docker-compose -p $PKG_NAME stop &>/dev/null
  docker-compose -p $PKG_NAME rm -f &>/dev/null
  echo 'Done.'
}

function cleanService () {
  local SERVICE=$1
  if [[ -n "$SERVICE" ]]; then
    echo -n "Stopping and removing all '$SERVICE' containers... "
    docker-compose -p $PKG_NAME stop $SERVICE &>/dev/null
    docker-compose -p $PKG_NAME rm -f $SERVICE &>/dev/null
    echo 'Done.'
  fi
}

function startService () {
  local SERVICE=$1
  if [[ -n "$SERVICE" ]]; then
    echo -n "Starting service '$SERVICE'... "
    docker-compose -p $PKG_NAME up -d $SERVICE &>/dev/null
    echo 'Done.'
  fi
}

function stopService () {
  local SERVICE=$1
  if [[ -n "$SERVICE" ]]; then
    echo -n "Stopping all '$SERVICE' containers... "
    docker-compose -p $PKG_NAME stop $SERVICE &>/dev/null
    echo 'Done.'
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
  cleanService cockroachdb
}

function setupCockroachDbInstance () {
  echo "CockroachDB Instance setup"
  cleanCockroachDbInstance
  startService cockroachdb
  sleep 2
  docker exec "${PKG_NAME}_cockroachdb_1" ./cockroach sql --insecure -e "CREATE DATABASE eventstore;"
  CREATE_TABLE_SQL=$(cat ${BASH_SOURCE%/*}/../src/DbAdapters/CockroachDB/createTable.sql)
  docker exec "${PKG_NAME}_cockroachdb_1" ./cockroach sql --insecure -d eventstore -e "$CREATE_TABLE_SQL"
  echo "CockroachDB Instance setup END"
}

function cleanPostgreSQLInstance () {
  cleanService postgresql &> /dev/null
}

function setupPostgreSQLInstance () {
  cleanPostgreSQLInstance &> /dev/null
  startService postgresql &> /dev/null
  sleep 4
}

function cleanTestServer () {
  cleanService testServer &> /dev/null
}

function startTestServer () {
  cleanTestServer &> /dev/null
  startService testServer &> /dev/null
  sleep 2
}

function separator () {
  echo "================================================="
}
