[![Build Status](https://travis-ci.org/caviarjs/next-block.svg?branch=master)](https://travis-ci.org/caviarjs/next-block)
[![Coverage](https://codecov.io/gh/caviarjs/next-block/branch/master/graph/badge.svg)](https://codecov.io/gh/caviarjs/next-block)
<!-- optional appveyor tst
[![Windows Build Status](https://ci.appveyor.com/api/projects/status/github/caviarjs/next-block?branch=master&svg=true)](https://ci.appveyor.com/project/caviarjs/next-block)
-->
<!-- optional npm version
[![NPM version](https://badge.fury.io/js/@caviar/next-block.svg)](http://badge.fury.io/js/@caviar/next-block)
-->
<!-- optional npm downloads
[![npm module downloads per month](http://img.shields.io/npm/dm/@caviar/next-block.svg)](https://www.npmjs.org/package/@caviar/next-block)
-->
<!-- optional dependency status
[![Dependency Status](https://david-dm.org/caviarjs/next-block.svg)](https://david-dm.org/caviarjs/next-block)
-->

# @caviar/next-block

The official caviar block for next.

## Install

```sh
$ npm i @caviar/next-block
```

## Usage

For most scenarios, `@caviar/next-block` is used by a caviar binder and usually should not be used directly.

### Config

In `caviar.config.js`

```js
module.exports = {
  ...otherAnchors,

  [nextAnchorName] (compose) {

    // The config anchor of next should always returns
    // a FUNCTION!
    return compose([
      withCSS
    ], {
      distDir: '.next'
    })
  },

  [nextWebpackAnchorName] (
    webpackConfig,
    nextOptions,
    // The webpack module which `@caviar/next-block` uses
    // as the 3rd argument
    webpackModule
  ) {

    // Only add the DefinePlugin for client side
    if (nextOptions.isServer) {
      webpackConfig.plugins.push(
        new webpackModule.DefinePlugin({
          ...
        })
      )
    }

    // This method must return an object
    return webpackConfig
  }
}
```

- **nextAnchorName** `string` the name/key of the config anchor which is defined by the binder who uses `@caviar/next-block`

- **nextWebpackAnchorName** `string` the name of the config anchor for next webpack.

### extend(plugins, nextConfigMixins): Function
### extend(nextConfigMixins): Function

As the first and the only argument of the config anchor function, `extend` is actually the `withPlugins` method of [`next-compose-plugins`](https://www.npmjs.com/package/next-compose-plugins). Method `extend` extends the next config of the underlying caviar [layer], and provides the ability to merge the config from the current layer with the support of next build phases (such as `require('next/constants').PHASE_PRODUCTION_BUILD`).

- **plugins** `Array<NextPlugin | [NextPlugin, NextPluginOptions]>` Array of next plugin instances. The first parameter of `withPlugins`
- **nextConfigMixins?** `Object={}` the extra config to mix into the current next configuration. The second parameter of `withPlugins`

## Hooks

### ...builtInBlockHooks

See [Caviar Blocks]

### nextConfig `SyncHook`

Triggered after the next config is generated and before using.

- **nextConfig**
- **phase**
- **caviarOptions**

### webpackConfig

Triggered after webpack config is generated and before using.

- **webpackConfig**
- **caviarOptions**

## License

[MIT](LICENSE)
