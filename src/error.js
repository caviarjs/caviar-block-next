const {Errors, exitOnNotDefined} = require('err-object')

const {error, TE} = new Errors({
  messagePrefix: '[@caviar/block-next] ',
  codePrefix: 'CAVIAR_NEXT_',
  notDefined: exitOnNotDefined
})

TE('INVALID_ANCHOR_TYPE', 'the config anchor of next in "%s" must be a function')

TE('INVALID_ANCHOR_RETURN_TYPE',
  'the config anchor of next in "%s" should return a function by using the first argument `withPlugins`')

module.exports = {
  error
}
