const fixture = require('test-fixture')
const {runBlock} = require('@caviar/test')
const http = require('http')
const supertest = require('supertest')

const NextBlock = require('..')

module.exports = async (name, options) => {
  const {copy, resolve} = fixture('simple')
  await copy(resolve('..', `simple-${name}`))

  options.cwd = resolve()

  const block = await runBlock(NextBlock, options)
  const server = http.createServer(block.middleware())
  const agent = supertest(server)

  return {
    get (path) {
      return agent.get(path)
    },
    resolve
  }
}
