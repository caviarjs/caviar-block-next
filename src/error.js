const {Errors, exitOnNotDefined} = require('err-object')

const {error, E, TE} = new Errors({
  messagePrefix: '[@caviar/next-block] ',
  codePrefix: 'CAVIAR_NEXT_',
  notDefined: exitOnNotDefined
})

TE('INVALID_ANCHOR_TYPE',
  'the config anchor of next in "%s" must be a function')

TE('INVALID_ANCHOR_RETURN_TYPE',
  'the config anchor of next in "%s" should return a function by using the first argument `extend`')

TE('INVALID_WEBPACK_ANCHOR_TYPE',
  'the config anchor of nextWebpack in "%s" must be a function')

TE('INVALID_WEBPACK_ANCHOR_RETURN_TYPE',
  'the config anchor of nextWebpack in "%s" should return an object')

TE('INVALID_NEXT_WEBPACK_RETURN_TYPE',
  'nextConfig.webpack should return an object')

const MORE_INFO = ', see "https://github.com/caviarjs/next-block#composeplugins-nextconfigmixins" for details'

E('INVALID_COMPOSE_ARG',
  `invalid argument for compose in "%s"${MORE_INFO}`, TypeError)

E('NEXT_NOT_FOUND',
  'module "next" need to be installed')

E('NEXT_SERVER_NOT_FOUND',
  'module "next-server" need to be installed')

module.exports = {
  error
}
