
const test = require('ava')
const create = require('./create')

const nextConfig = withPlugins => withPlugins({
  distDir: '.next'
})

const CASES = [
  ['INVALID_ANCHOR_TYPE', {
    configChain: [{
      next: 1
    }]
  }],
  ['INVALID_ANCHOR_RETURN_TYPE', {
    configChain: [{
      next: () => 1
    }]
  }],
  ['INVALID_WEBPACK_ANCHOR_TYPE', {
    configChain: [{
      next: nextConfig,
      nextWebpack: 1
    }]
  }],
  ['INVALID_WEBPACK_ANCHOR_RETURN_TYPE', {
    configChain: [{
      next: nextConfig,
      nextWebpack: () => 1
    }]
  }],
  ['INVALID_NEXT_WEBPACK_RETURN_TYPE', {
    configChain: [{
      next: withPlugins => withPlugins({
        webpack: () => 1
      })
    }]
  }],
  ['INVALID_COMPOSE_ARG', {
    configChain: [{
      next: withPlugins => withPlugins()
    }]
  }],
  ['INVALID_COMPOSE_ARG', {
    configChain: [{
      next: withPlugins => withPlugins([], 1)
    }]
  }],
]

CASES.forEach(([code, options], i) => {
  test(`${i}: error: ${code}`, async t => {
    await t.throwsAsync(() => create(`${code}_${i}`, {
      ...options,
      // dev is easier to test
      dev: true
    }), {
      code: `CAVIAR_NEXT_${code}`
    })
  })
})
