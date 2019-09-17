const test = require('ava')
const create = require('./create')

const nextConfig = withPlugins => withPlugins({
  distDir: '.next'
})

const JUST_RETURN = x => x

test('basic', async t => {
  const {get} = await create('BASIC', {
    configChain: [{
      next: nextConfig
    }, {
      next: nextConfig
    }],
    dev: true
  })

  const {statusCode, text} = await get('/index')

  t.is(statusCode, 200)
  t.true(text.includes('hello'))
})

test('basic: koa', async t => {
  const {get} = await create('KOA', {
    configChain: [{
      next: nextConfig
    }],
    dev: true
  }, {
    koa: true
  })

  const {statusCode, text} = await get('/index')

  t.is(statusCode, 200)
  t.true(text.includes('hello'))
})

test('next: dev: false', async t => {
  await create('NO-DEV', {
    configChain: [{
      next: withPlugins => withPlugins({
        distDir: '.next',
        webpack: JUST_RETURN
      }),
      // webpack anchor
      nextWebpack: JUST_RETURN
    }, {
      // another layer
      nextWebpack: JUST_RETURN
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
