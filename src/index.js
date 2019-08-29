const {parse} = require('url')
const {resolve, dirname} = require('path')
const {isFunction, isObject} = require('core-util-is')
const {extend, withPlugins} = require('next-compose-plugins')
const e2k = require('express-to-koa')
// const next = require('next')
// const webpackModule = require('webpack')
const {compose} = require('compose-middleware')
const serve = require('serve-static')
const mount = require('connect-mount')
// const {
//   PHASE_PRODUCTION_BUILD,
//   PHASE_PRODUCTION_SERVER,
//   PHASE_DEVELOPMENT_SERVER
// } = require('next/constants')
const {
  SyncHook
} = require('tapable')
const {
  ensureLeading,
  removeEnding
} = require('pre-suf')
const {
  Block,
  utils: {
    requireModule
  }
} = require('caviar')
const {error} = require('./error')
const {withPluginsArgs} = require('./options')
const nextModule = require('./next-module')

const PHASE_BUILD = 'build'
const PHASE_DEFAULT = 'default'
const DEFAULT_DIST_DIR = '.next'

// options:
// ...next options
// - dir `path` the next dir relative to cwd
// - static `object` options for serve-static
const createNextWithPlugins = (configFilepath, config) => {
  const wp = config
    ? extend(config).withPlugins
    : withPlugins

  return (...args) => {
    const [plugins, options] = withPluginsArgs(configFilepath, ...args)
    const cfg = wp(plugins, options)

    // nextConfig.static
    if (options.static) {
      cfg.static = {
        ...cfg.static,
        ...options.static
      }
    }

    return cfg
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

const SLASH = '/'
const EMPTY = ''
const ensurePath = p => removeEnding(ensureLeading(p, SLASH), SLASH)

// Thinking(DONE):
// inherit or delegate? inherit
class NextBlock extends Block {
  constructor () {
    super()

    // Mixer will check the config structure
    // this.config is a setter
    this.config = {
      next: {
        type: 'compose',
        compose: composeNext
      },

      nextWebpack: {
        type: 'compose',
        // For mixer, which means that
        // the mixer could skip defining the nextWebpack
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

    this.phases = [PHASE_DEFAULT, PHASE_BUILD]

    this._next = null
  }

  get next () {
    if (this._next) {
      return this._next
    }

    const {
      resolved,
      module
    } = this.options.dev
      ? nextModule.getNext()
      : nextModule.getNextServer()

    const root = dirname(resolved)

    const constants = nextModule.getNextSubModule(root, 'constants')

    return {
      resolved,
      module,
      root,
      constants
    }
  }

  _createNextConfig (
    nextConfigFactory,
    webpackConfigFactory,
    caviarOptions
  ) {
    const {
      phase: caviarPhase,
      dev
    } = caviarOptions

    const {constants} = this.next

    const phase = caviarPhase === PHASE_BUILD
      ? constants.PHASE_PRODUCTION_BUILD
      : dev
        ? constants.PHASE_DEVELOPMENT_SERVER
        : constants.PHASE_PRODUCTION_SERVER

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
    // We do not require webpack to start the server in production
    // so skip this method when dev is false
    if (!this.options.dev) {
      return
    }

    const {webpack} = nextConfig
    const {root} = this.next

    const webpackModule = nextModule.getNextWebpack(root)

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

  create (config, caviarOptions) {
    const {dev, cwd, phase} = caviarOptions
    if (phase === PHASE_BUILD) {
      return
    }

    const nextConfig = this._createNextConfig(
      config.next,
      config.nextWebpack,
      caviarOptions
    )

    this._nextConfig = nextConfig

    const {module} = this.next

    return module({
      dev,
      conf: nextConfig,
      dir: getNextDir(cwd, nextConfig)
    })
  }

  async run (config, caviarOptions) {
    const {dev, cwd, phase} = caviarOptions

    // phase build
    if (phase === PHASE_BUILD) {
      if (dev) {
        return
      }

      const nextConfig = this._createNextConfig(
        config.next,
        config.nextWebpack,
        caviarOptions
      )

      await requireModule('next/dist/build')(
        getNextDir(cwd, nextConfig),
        nextConfig
      )
      return
    }

    // phase default
    await this.outlet.prepare()
  }

  // Custom public methods
  // Create the middleware of next
  middleware () {
    const {dev} = this.options
    if (dev) {
      return this.devMiddleware()
    }

    return this.prodMiddleware()
  }

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

  prodMiddleware () {
    const {cwd} = this.options
    const {
      // next-block specified property
      static: serveStaticOptions,
      // next-block specified property
      assetPrefix = EMPTY,
      staticFilePublicPath = '/static',
      distDir = DEFAULT_DIST_DIR
    } = this._nextConfig

    const nextStaticPublicPathPrefix = assetPrefix
      ? ensurePath(parse(assetPrefix).pathname)
      : EMPTY

    const nextDir = getNextDir(cwd, this._nextConfig)

    const serveStatic = mount(
      ensurePath(staticFilePublicPath),
      serve(resolve(nextDir, 'static'), serveStaticOptions)
    )
    const serveNextStatic = mount(
      `${nextStaticPublicPathPrefix}/_next/static`,
      serve(resolve(nextDir, distDir, 'static'), serveStaticOptions)
    )

    return compose([
      serveStatic,
      serveNextStatic
    ])
  }
}

NextBlock.middleware2Koa = middleware => {
  const converted = e2k(middleware)
  return (ctx, done) => {
    const {req} = ctx

    // TODO, query
    req.params = {
      ...req.params,
      ...ctx.params
    }

    return converted(ctx, done)
  }
}

module.exports = NextBlock
