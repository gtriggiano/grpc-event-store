import shortid from 'shortid'

export default function GetUniqueId () {
  return (_, callback) => callback(null, {uniqueId: shortid()})
}
