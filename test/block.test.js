const test = require('ava')
const {runBlock} = require('@caviar/test')
const NextBlock = require('..')

test('basic', async t => {
  const block = await runBlock(NextBlock)

  t.pass()
})
