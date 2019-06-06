const {parse} = require('url')
const {resolve} = require('path')
const {isFunction, isObject} = require('core-util-is')
const {extend, withPlugins} = require('next-compose-plugins')
const e2k = require('express-to-koa')
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
const {
  Block,
  utils: {
    requireModule
  }
} = require('caviar')
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

// Usage
// ```js
// module.exports = (webpackConfig, nextOptions, webpackModule) => {
//   // do something
//   return webpackConfig
// }
// ```
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

const getNextDir = (cwd, {dir}) => {
  if (!dir) {
    return cwd
  }

  return resolve(cwd, dir)
}

// Thinking(DONE):
// inherit or delegate? inherit
class NextBlock extends Block {
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
      nextConfig: new SyncHook('nextConfig'),
      webpackConfig: new SyncHook(['webpackConfig', 'nextContext'])
    }
  }

  _createNextConfig (
    phase,
    nextConfigFactory,
    webpackConfigFactory,
    caviarOptions
  ) {
    const nextConfig = nextConfigFactory(
      phase,
      // {defaultConfig: undefined}
      {}
    )

    this._mergeWebpackFactory(
      nextConfig, webpackConfigFactory, caviarOptions)
    this.hooks.nextConfig.call(nextConfig, phase, caviarOptions)

    return nextConfig
  }

  _mergeWebpackFactory (
    nextConfig,
    webpackConfigFactory,
    caviarOptions
  ) {
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

      this.hooks.webpackConfig.call(
        webpackConfig, nextOptions, caviarOptions)
      return webpackConfig
    }
  }

  // Override
  // - config `Object` the composed configuration
  // - caviarOptions `Object`
  //   - cwd
  //   - dev
  async _build (config, caviarOptions) {
    const {dev, cwd} = caviarOptions

    if (dev) {
      return
    }

    const nextConfig = this._createNextConfig(
      PHASE_PRODUCTION_BUILD,
      config.next,
      config.webpack,
      caviarOptions
    )

    await requireModule('next/dist/build')(
      getNextDir(cwd, nextConfig),
      nextConfig
    )
  }

  _create (config, caviarOptions) {
    const {dev, cwd} = caviarOptions

    const phase = dev
      ? PHASE_DEVELOPMENT_SERVER
      : PHASE_PRODUCTION_SERVER

    const nextConfig = this._createNextConfig(
      phase,
      config.next,
      config.nextWebpack,
      caviarOptions
    )

    // TODO: ensure default config

    return next({
      dev,
      conf: nextConfig,
      dir: getNextDir(cwd, nextConfig)
    })
  }

  async _ready () {
    await this.outlet.prepare()
  }

  // Custom public methods
  // Create the dev middleware of next
  devMiddleware () {
    const nextApp = this.outlet
    const handler = nextApp.getRequestHandler()
    return (req, res) => {
      const {
        // If you use a koa-based server
        // const e2k = require('express-to-koa')
        params = {},
        url
      } = req

      const {
        pathname,
        query
      } = parse(url, true)

      const parsedUrl = {
        pathname,
        query: {
          ...query,
          // So that we could get router params in getInitialProps
          ...params
        }
      }

      handler(req, res, parsedUrl)
    }
  }
}

NextBlock.middleware2Koa = middleware => {
  const converted = e2k(middleware)
  return ctx => {
    const {req} = ctx

    req.params = {
      ...req.params,
      ...ctx.params
    }

    return converted(ctx)
  }
}

module.exports = NextBlock
