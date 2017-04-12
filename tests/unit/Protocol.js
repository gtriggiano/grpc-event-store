import fs from 'fs'
import should from 'should/as-function'

const libFolder = `../../${process.env.LIB_FOLDER}`
const Protocol = require(`${libFolder}/Protocol`)

describe('Protocol', () => {
  describe('.PROTOCOL_FILE_PATH', () => {
    it('is the absolute path of the library .proto file', () => {
      should(Protocol.PROTOCOL_FILE_PATH).be.a.String()
      should(Protocol.PROTOCOL_FILE_PATH.substring(0, 1)).equal('/')
      let protoFileContent = fs.readFileSync(Protocol.PROTOCOL_FILE_PATH)
      should(protoFileContent.slice(0, 18).toString()).equal('syntax = "proto3";')
    })
  })
  describe('.getProtocol()', () => {
    it('is a function', () => should(Protocol.getProtocol).be.a.Function())
    it('returns the protocol object of the grpceventstore package defined by the .proto file', () => {
      let protocol = Protocol.getProtocol()
      should(protocol.EventStore).be.a.Function()
      should(protocol.EventStore.service).be.an.Object()
    })
  })
})
