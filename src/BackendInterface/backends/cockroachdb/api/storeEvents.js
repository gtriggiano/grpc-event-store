import { flatten } from 'lodash'
import EventEmitter from 'eventemitter3'

import getStreamVersionNumber from '../operations/getStreamVersionNumber'
import storeStreamEvents from '../operations/storeStreamEvents'

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
  let { stream, expectedVersionNumber, events } = request

  let eMsg = prefixString(`Stream ${stream} `)

  let noConsistencyRequired = expectedVersionNumber === -2
  let streamShouldJustExist = expectedVersionNumber === -1

  return getStreamVersionNumber(client, stream)
    .then(actualVersionNumber => {
      let streamExists = !!actualVersionNumber

      if (noConsistencyRequired) return actualVersionNumber
      if (streamShouldJustExist && !streamExists) throw new Error(eMsg('does not exist'))

      if (actualVersionNumber !== expectedVersionNumber) throw new Error(eMsg('version mismatch'))

      return actualVersionNumber
    })
    .then(actualVersionNumber =>
      storeStreamEvents(
        client,
        stream,
        actualVersionNumber,
        events,
        transactionId
      )
    )
    .catch(error => error)
}

export default storeEventsFactory
