const {isArray, isObject} = require('core-util-is')

const {error} = require('./error')

const withPluginsArgs = (configFilepath, plugins, nextConfigMixins = {}) => {
  if (!isArray(plugins)) {
    if (isObject(plugins)) {
      return [[], plugins]
    }

    throw error('INVALID_COMPOSE_ARG', configFilepath)
  }

  if (!isObject(nextConfigMixins)) {
    throw error('INVALID_COMPOSE_ARG', configFilepath)
  }

  return [plugins, nextConfigMixins]
}

module.exports = {
  withPluginsArgs
}
