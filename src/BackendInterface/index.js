import { merge } from 'lodash'

import backends from './backends'
import { prefixString, isValidString } from '../utils'

const availableBackends = Object.keys(backends)

function BackendInterface (_settings) {
  let customBackendInstance = _settings instanceof CustomBackendWrapper
  if (customBackendInstance) return _settings.backend

  let settings = merge({}, defaultSettings, _settings)
  _validateSettings(settings)

  let {
    type
  } = settings

  return backends[type](settings)
}

const defaultSettings = {
  type: 'cockroachdb',
  host: 'localhost',
  port: 26257,
  database: 'eventstore',
  user: 'root'
}

const iMsg = prefixString('[gRPC EventStore BackendInterface]: ')
function _validateSettings (settings) {
  let {
    type
  } = settings
  if (!isValidString(type)) throw new TypeError(iMsg('settings.host should be a valid string'))
  if (!~availableBackends.indexOf(type)) throw new Error(iMsg(`"${type}" backend type is not supported.`))
}

function CustomBackendWrapper (backendInstance) { this.backend = backendInstance }
function wrapCustomBackendInstance (backendInstance) { return new CustomBackendWrapper(backendInstance) }
BackendInterface.customBackend = wrapCustomBackendInstance

export default BackendInterface
export {
  CustomBackendWrapper
}
