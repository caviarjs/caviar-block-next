const fixture = require('test-fixture')
const {runBlock} = require('@caviar/test')
const supertest = require('supertest')
const Koa = require('koa')
const express = require('express')

const NextBlock = require('..')

const {middleware2Koa} = NextBlock

const SIMPLE = 'simple'

module.exports = async (name, options, {
  needCopy = true,
  koa
} = {}) => {
  const targetName = `simple-${name}`

  const {copy, resolve} = fixture(
    needCopy
      ? SIMPLE
      : targetName
  )

  if (needCopy) {
    await copy(resolve('..', targetName))
  }

  options.cwd = resolve()

  const block = await runBlock(NextBlock, options)

  const {phase} = options

  if (phase === 'build') {
    return
  }

  const middleware = block.middleware()

  const app = koa
    ? new Koa()
    : express()

  if (koa) {
    app.use(middleware2Koa(middleware))
  } else {
    // express
    app.get('/index', (req, res) => {
      block.render(req, res, '/index')
      .then(html => {
        res.end(html)
      })
    })

    app.use(middleware)
  }

  const agent = supertest(
    koa
      ? app.callback()
      : app
  )

  return {
    get (path) {
      return agent.get(path)
    },
    resolve,
    app,
    block
  }
}
