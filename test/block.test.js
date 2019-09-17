const test = require('ava')
const create = require('./create')

const nextConfig = withPlugins => withPlugins({
  distDir: '.next'
})

test('basic', async t => {
  const {get} = await create('BASIC', {
    configChain: [{
      next: nextConfig
    }],
    dev: true
  })

  const {statusCode, text} = await get('/index')

  t.is(statusCode, 200)
  t.true(text.includes('hello'))
})

test('next: dev: false', async t => {
  await create('NO-DEV', {
    configChain: [{
      next: nextConfig
    }],
    phase: 'build'
  })

  const {get} = await create('NO-DEV', {
    configChain: [{
      next: nextConfig
    }]
  }, {
    needCopy: false
  })

  const {statusCode, text} = await get('/index')

  t.is(statusCode, 200)
  t.true(text.includes('hello'))
})
