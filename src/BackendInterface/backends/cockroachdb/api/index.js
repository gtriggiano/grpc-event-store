import getEvents from './getEvents'
import getEventsByStream from './getEventsByStream'
import getEventsByStreamCategory from './getEventsByStreamCategory'
import storeEvents from './storeEvents'

const apiHandlersFactories = {
  getEvents,
  getEventsByStream,
  getEventsByStreamCategory,
  storeEvents
}

export default apiHandlersFactories
