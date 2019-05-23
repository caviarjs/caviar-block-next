const {isFunction} = require('core-util-is')
const {extend, withPlugins} = require('next-compose-plugins')
const next = require('next')
const {
  PHASE_PRODUCTION_BUILD,
  PHASE_PRODUCTION_SERVER,
  PHASE_DEVELOPMENT_SERVER
} = require('next/constants')
const {
  SyncHook
} = require('tapable')
const {Block} = require('caviar')
const {error} = require('./error')
const {withPluginsArgs} = require('./options')

const createNextWithPlugins = (configFilepath, config) => {
  const wp = config
    ? extend(config).withPlugins
    : withPlugins

  return (...args) => {
    const [plugins, options] = withPluginsArgs(configFilepath, ...args)
    return wp(plugins, options)
  }
}

const composeNext = ({
  prev,
  anchor,
  configFilepath
}) => {
  if (!anchor) {
    return prev
  }

  if (!isFunction(anchor)) {
    throw error('INVALID_ANCHOR_TYPE', configFilepath, anchor)
  }

  // Usage
  // ```js
  // module.exports = withPlugins => withPlugins([...plugins], newConfig)
  // ```
  // withPlugins <- createNextWithPlugins(prev)
  const result = anchor(createNextWithPlugins(configFilepath, prev))

  if (!isFunction(result)) {
    throw error('INVALID_ANCHOR_RETURN_TYPE', configFilepath, result)
  }

  return result
}

const composeNextWebpack = ({}) => {
  // TODO
}

// Thinking(DONE):
// inherit or delegate? inherit
module.exports = class NextBlock extends Block {
  constructor () {
    super()

    // Binder will check the config structure
    // this.config is a setter
    this.config = {
      next: {
        type: 'compose',
        compose: composeNext
      },

      nextWebpack: {
        type: 'compose',
        // For binder, which means that
        // the binder could skip defining the nextWebpack
        optional: true,
        compose: composeNextWebpack
      }
    }

    // this.hooks is a setter
    this.hooks = {
      config: new SyncHook('nextConfig'),
      webpackConfig: new SyncHook(['webpackConfig', 'nextContext'])
    }
  }

  // Override
  // - config `Object` the composed configuration
  // - caviarOptions `Object`
  //   - cwd
  //   - dev
  async _create (config, {dev, cwd}) {
    const phase = dev
      ? PHASE_DEVELOPMENT_SERVER
      : PHASE_PRODUCTION_SERVER

    const nextConfig = this._createNextConfig(
      phase,
      config.next,
      config.nextWebpack
    )

    this.hooks.config.call(nextConfig)

    return next({
      dev,
      conf: nextConfig,
      dir: cwd
    })
  }

  _createNextConfig (
    phase,
    nextConfigFactory,
    webpackConfigFactory
  ) {
    const nextConfig = nextConfigFactory(
      phase,
      // {defaultConfig: undefined}
      {}
    )


  }

  async _prepare () {
    await this.outlet.prepare()
  }

  // Custom public methods
  middleware () {
    // TODO: outlet ?
    const nextApp = this.outlet
    const handler = nextApp.getRequestHandler()
    const middleware = (req, res) => {
      const {
        [e2k.CONTEXT]: ctx
      } = req

      const {
        params = {},
        url
      } = ctx

      const {
        pathname,
        query
      } = parse(url)

      const parsedUrl = {
        pathname,
        query: {
          ...query,
          ...params
        }
      }

      handler(req, res, parsedUrl)
    }

    return middleware
  }
}
