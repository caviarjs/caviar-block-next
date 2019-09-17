
const test = require('ava')
const {runBlock} = require('@caviar/test')
const http = require('http')
const {resolve} = require('test-fixture')()
const supertest = require('supertest')

const NextBlock = require('..')

test('basic', async t => {
  const block = await runBlock(NextBlock, {
    configChain: [{}],
    cwd: resolve('simple'),
    dev: true
  })

  const server = http.createServer(block.middleware())
  await new Promise(r => {
    server.listen(8888, r)
  })

  const {
    statusCode,
    text
  } = supertest(server).get('/index')

  t.is(statusCode, 200)
  t.true(text.includes('hello'))
})
