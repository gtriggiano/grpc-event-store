import { isString, isInteger, isArray, range, curry, every, some } from 'lodash'
import Rx from 'rxjs'

let validHostnameRegex = /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/

export let prefixString = curry((prefix, str) => `${prefix}${str}`)

export let timeoutCallback = curry((timeout, msg, cb) => {
  let _called = false
  let _invoke = (...args) => {
    if (_called) return
    _called = true
    cb(...args)
  }
  setTimeout(() => {
    _invoke(new Error(msg))
  }, timeout)
  return _invoke
})

export let isValidString = (str) => isString(str) && !!str.length

export let isValidHostname = (str) => isString(str) && validHostnameRegex.test(str)

export let isPositiveInteger = (n) => isInteger(n) && n > 0

export let isListOfValidStrings = (list) => isArray(list) && every(list, isValidString)

export let isWritableStream = (stream, writableStreamsRegexList) => {
  if (
    !writableStreamsRegexList ||
    !writableStreamsRegexList.length
  ) return true

  return some(writableStreamsRegexList, (regex) => regex.test(stream))
}

export let zeropad = (i, minLength) => {
  let str = String(i)
  let diff = minLength - str.length
  if (diff > 0) {
    str = `${range(diff).map(() => 0).join('')}${str}`
  }
  return str
}

export let eventsStreamFromBus = (bus, delayTime = 100) => {
  let receivedEvents = {
    ids: [],
    byId: {}
  }

  // We create an hot observable through the publish().connect() sequence
  let stream = Rx.Observable.fromEvent(bus, 'StoredEvents')
    .map(msg => JSON.parse(msg))
    .flatMap(events => Rx.Observable.from(events))
    .map(evt => {
      let evtId = zeropad(evt.id, 25)
      receivedEvents.ids.push(evtId)
      receivedEvents.ids.sort()
      receivedEvents.byId[evtId] = evt
      return receivedEvents
    })
    .delay(delayTime)
    .map(evt => {
      let oldestEventId = receivedEvents.ids.shift()
      let oldestEvent = receivedEvents.byId[oldestEventId]
      delete receivedEvents.byId[oldestEventId]
      return oldestEvent
    })
    .publish()

  stream.connect() // TODO: should we take a reference to this subscription to end it later?

  return stream
}

export let eventsStreamFromBackendEmitter = (e) => {
  let evt = Rx.Observable.fromEvent(e, 'event')
  let error = Rx.Observable.fromEvent(e, 'error').flatMap(err => Rx.Observable.throw(err))
  let end = Rx.Observable.fromEvent(e, 'end')

  return evt.merge(error).takeUntil(end)
}
