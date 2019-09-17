const test = require('ava')
const create = require('./create')

test('basic', async t => {
  const {get} = await create('BASIC', {
    configChain: [{
      next (withPlugins) {
        return withPlugins({
          distDir: '.next'
        })
      }
    }],
    dev: true
  })

  const {statusCode, text} = await get('/index')

  t.is(statusCode, 200)
  t.true(text.includes('hello'))
})
