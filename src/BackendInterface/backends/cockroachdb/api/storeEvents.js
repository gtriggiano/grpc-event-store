import { flatten, last } from 'lodash'
import EventEmitter from 'eventemitter3'

import createAggregate from '../operations/createAggregate'
import createAggregateSnapshot from '../operations/createAggregateSnapshot'
import getAggregate from '../operations/getAggregate'
import storeAggregateEvents from '../operations/storeAggregateEvents'
import updateAggregateVersion from '../operations/updateAggregateVersion'

import transactionWrapper from '../helpers/transactionWrapper'

import { prefixString } from '../../../../utils'

function storeEventsFactory (getConnection) {
  return ({writeRequests, transactionId}) => {
    let results = new EventEmitter()

    getConnection((err, {client, release}) => {
      if (err) return results.emit('error', err)
      transactionWrapper(
        client,
        (client, done) => {
          Promise.resolve().then(() => {
            let responses = []
            return writeRequests.reduce(
              (previousRequest, req) => {
                let request = req
                return previousRequest.then(() =>
                  writeToAggregateStream(client, request, transactionId)
                  .then(response => responses.push(response))
                )
              },
              Promise.resolve()
            ).then(() => responses)
          })
          .then(responses => {
            let errors = responses
              .filter(response => response instanceof Error)
            if (errors.length) {
              let errorsMessages = errors
                .map(({message}) => message)
                .join(', ')
              throw new Error(`Events writing failed because of the following errors: ${errorsMessages}`)
            }
            return flatten(responses)
          })
          .then(storedEvents => done(null, storedEvents))
          .catch(done)
        },
        (err, storedEvents) => {
          release()
          if (err) return results.emit('error', err)
          results.emit('storedEvents', storedEvents)
        }
      )
    })

    return results
  }
}

function writeToAggregateStream (client, request, transactionId) {
  let { aggregateIdentity, events, expectedAggregateVersion, snapshot } = request

  let eMsg = prefixString(`Aggregate [${aggregateIdentity.type}@${aggregateIdentity.id}] `)

  let consistentVersioningRequired = expectedAggregateVersion > -1
  let clientWantsToCreateAggregate = expectedAggregateVersion === 0

  return getAggregate(client, aggregateIdentity)
    .then(aggregate => {
      let aggregateExists = !!aggregate
      if (
        !consistentVersioningRequired &&
        aggregateExists
      ) return aggregate
      if (
        !consistentVersioningRequired &&
        !aggregateExists
      ) return createAggregate(client, aggregateIdentity)
      if (
        clientWantsToCreateAggregate &&
        aggregateExists
      ) throw new Error(eMsg('already exists'))
      if (
        clientWantsToCreateAggregate &&
        !aggregateExists
      ) return createAggregate(client, aggregateIdentity)

      if (!aggregate) throw new Error(eMsg('does not exists'))
      if (aggregate.version !== expectedAggregateVersion) throw new Error(eMsg('version mismatch'))

      return aggregate
    })
    .then(aggregate =>
      storeAggregateEvents(
        client,
        aggregate,
        events,
        transactionId
      )
    )
    .then(storedEvents =>
      updateAggregateVersion(
        client,
        aggregateIdentity,
        last(storedEvents).sequenceNumber
      ).then(() => storedEvents)
    )
    .then(storedEvents =>
      snapshot
        ? createAggregateSnapshot(
            client,
            aggregateIdentity,
            last(storedEvents).sequenceNumber,
            snapshot
          ).then(() => storedEvents)
        : storedEvents
    )
    .catch(error => error)
}

export default storeEventsFactory
