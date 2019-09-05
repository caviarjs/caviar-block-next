const {join, dirname} = require('path')
const resolveFrom = require('resolve-from')

const {error} = require('./error')

const resolve = (id, errorCode) => {
  let resolved

  try {
    resolved = require.resolve(id)
  } catch (err) {
    throw error(errorCode)
  }

  return resolved
}

// eslint-disable-next-line no-underscore-dangle
const cleanModule = module => module.__esModule
  ? module.default
  : module

const createGet = (id, errorCode) => () => {
  const resolved = resolve(id, errorCode)
  const root = dirname(require.resolve(`${id}/package.json`))

  return {
    module: cleanModule(require(resolved)),
    // The root directory of a package
    root
  }
}

// Get the next module installed
const getNext = createGet('next', 'NEXT_NOT_FOUND')

// Get the webpack module which next uses
const getNextWebpack = nextRoot => {
  const resolved = resolveFrom(nextRoot, 'webpack')
  return require(resolved)
}

// Get the next-server module installed
const getNextServer = createGet('next', 'NEXT_NOT_FOUND')

// Get next/constants or next-server/constants
const getNextSubModule = (nextRoot, id) => {
  const path = join(nextRoot, id)
  return cleanModule(require(path))
}

module.exports = {
  getNext,
  getNextWebpack,
  getNextServer,
  getNextSubModule
}
