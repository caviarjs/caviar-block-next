const {isFunction, isObject} = require('core-util-is')
const {extend, withPlugins} = require('next-compose-plugins')
const next = require('next')
const webpackModule = require('webpack')
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

const runWebpackFactory = (factory, configFilepath, ...args) => {
  const config = factory(...args)

  if (!isObject(config)) {
    throw error('INVALID_WEBPACK_ANCHOR_RETURN_TYPE', configFilepath, config)
  }

  return config
}

const composeNextWebpack = ({
  prev,
  anchor,
  configFilepath
}) => {
  if (!isFunction(anchor)) {
    throw error('INVALID_WEBPACK_ANCHOR_TYPE', configFilepath, anchor)
  }

  return prev
    ? (webpackConfig, nextOptions, wpModule) => {
      const config = prev(
        webpackConfig,
        nextOptions,
        wpModule
      )
      return runWebpackFactory(anchor, configFilepath,
        config,
        nextOptions,
        wpModule)
    }
    : (...args) => runWebpackFactory(anchor, configFilepath, ...args)
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
        // allow that the anchor is not found in each layer
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

    this._mergeWebpackFactory(nextConfig, webpackConfigFactory)
    this.hooks.config.call(nextConfig, phase)

    return nextConfig
  }

  _mergeWebpackFactory (nextConfig, webpackConfigFactory) {
    const {webpack} = nextConfig

    nextConfig.webpack = (webpackConfig, nextOptions) => {
      if (webpack) {
        webpackConfig = webpack(webpackConfig, nextOptions)

        if (!isObject(webpackConfig)) {
          throw error('INVALID_NEXT_WEBPACK_RETURN_TYPE', webpackConfig)
        }
      }

      if (webpackConfigFactory) {
        webpackConfig = webpackConfigFactory(
          webpackConfig,
          nextOptions,
          webpackModule
        )
      }

      this.hooks.webpackConfig.call(webpackConfig, nextOptions)
      return webpackConfig
    }
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
