[![Build Status](https://travis-ci.org/caviarjs/caviar-block-next.svg?branch=master)](https://travis-ci.org/caviarjs/caviar-block-next)
[![Coverage](https://codecov.io/gh/caviarjs/caviar-block-next/branch/master/graph/badge.svg)](https://codecov.io/gh/caviarjs/caviar-block-next)
<!-- optional appveyor tst
[![Windows Build Status](https://ci.appveyor.com/api/projects/status/github/caviarjs/caviar-block-next?branch=master&svg=true)](https://ci.appveyor.com/project/caviarjs/caviar-block-next)
-->
<!-- optional npm version
[![NPM version](https://badge.fury.io/js/@caviar/block-next.svg)](http://badge.fury.io/js/@caviar/block-next)
-->
<!-- optional npm downloads
[![npm module downloads per month](http://img.shields.io/npm/dm/@caviar/block-next.svg)](https://www.npmjs.org/package/@caviar/block-next)
-->
<!-- optional dependency status
[![Dependency Status](https://david-dm.org/caviarjs/caviar-block-next.svg)](https://david-dm.org/caviarjs/caviar-block-next)
-->

# @caviar/block-next

The official caviar block for next.

## Install

```sh
$ npm i @caviar/block-next
```

## Usage

For most scenarios, `@caviar/block-next` is used by a caviar orchestrator and should not be used directly.

In `caviar.config.js`

```js
module.exports = {
  ...,
  [nextAnchorName] (compose) {

    // The config anchor of next should always returns
    // a FUNCTION!
    return compose([
      withCSS
    ], {
      distDir: '.next'
    })
  }
}
```

- **nextAnchorName** `string` the name/key of the config anchor which is defined by the orchestrator who uses `@caviar/block-next`

### compose(plugins, nextConfigMixins)
### compose(nextConfigMixins)

As the first and the only argument of the config anchor function, `compose` is actually the `withPlugins` method of [`next-compose-plugins`](https://www.npmjs.com/package/next-compose-plugins)

- **plugins** `Array<NextPlugin | [NextPlugin, NextPluginOptions]>` Array of next plugin instances. The first parameter of `withPlugins`
- **nextConfigMixins?** `Object={}` the extra config to mix into the current next configuration. The second parameter of `withPlugins`

## Hooks

## License

[MIT](LICENSE)
