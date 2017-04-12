import util from 'util'
import Rx from 'rxjs/Rx'
import grpc from 'grpc'
import {
  isString,
  isEmpty,
  isInteger,
  isArray,
  isObject,
  isFunction,
  range,
  curry,
  every,
  some
} from 'lodash'

export const prefixedString = curry((prefix, str) => `${prefix}${str}`)

export const isNotEmptyString = str => isString(str) && !isEmpty(str)

export const isPositiveInteger = n => isInteger(n) && n > 0

export const isArrayOfNotEmptyStrings = arr => isArray(arr) && every(arr, isNotEmptyString)

export const areValidGRPCCredentials = credentials => credentials instanceof grpc.ServerCredentials

export const hasDbAdapterInterface = dbAdapter =>
  isObject(dbAdapter) &&
  isFunction(dbAdapter.getEvents) &&
  isFunction(dbAdapter.getEventsByStream) &&
  isFunction(dbAdapter.getEventsByStreamsCategory) &&
  isFunction(dbAdapter.appendEvents)

export const hasStoreBusInterface = storeBus =>
  isObject(storeBus) &&
  isFunction(storeBus.on) &&
  isFunction(storeBus.publish) &&
  (
    !storeBus.safeOrderTimeframe ||
    (
      isInteger(storeBus.safeOrderTimeframe) &&
      storeBus.safeOrderTimeframe > 0
    )
  )

export const stringMatchesSomeRegex = curry((regexList, str) => {
  if (!regexList || isEmpty(regexList)) return true
  return some(regexList, regex => regex.test(str))
})

export const zeropad = (i, minLength) => {
  let str = String(i)
  let diff = Math.max(minLength - str.length, 0)
  let pad = range(diff).map(() => 0).join('')
  return `${pad}${str}`
}

export const eventsStreamFromDbEmitter = dbEmitter => {
  let eventsStream = Rx.Observable.fromEvent(dbEmitter, 'event')
  let errorsStream = Rx.Observable.fromEvent(dbEmitter, 'error').flatMap(e => Rx.Observable.throw(e))
  let endStream = Rx.Observable.fromEvent(dbEmitter, 'end')

  return eventsStream.merge(errorsStream).takeUntil(endStream)
}

export const eventsStreamFromStoreBus = storeBus => {
  let receivedEvents = {ids: [], byId: {}}

  function pushEvent (evt) {
    let id = zeropad(evt.id, 25)
    receivedEvents.ids.push(id)
    receivedEvents.ids.sort()
    receivedEvents.byId[id] = evt
    return true
  }
  function unshiftOldestEvent () {
    let eventId = receivedEvents.ids.shift()
    let evt = receivedEvents.byId[eventId]
    delete receivedEvents.byId[eventId]
    return evt
  }

  let eventsStream = Rx.Observable.fromEvent(storeBus, 'newEvents')
    .map(payload => JSON.parse(payload))
    .flatMap(events => Rx.Observable.from(events))
    .map(pushEvent)

  if (storeBus.safeOrderTimeframe) {
    eventsStream = eventsStream.delay(storeBus.safeOrderTimeframe)
  }

  eventsStream = eventsStream
    .map(unshiftOldestEvent)
    .publish()

  eventsStream.connect()

  return eventsStream
}

export const defineError = (errorName, errorMessage) => {
  function CustomError () {
    Error.captureStackTrace(this, this.constructor)
    this.name = errorName
    this.message = errorMessage
  }

  util.inherits(CustomError, Error)
  Object.defineProperty(CustomError, 'name', {value: `${errorName}`})
  return CustomError
}
