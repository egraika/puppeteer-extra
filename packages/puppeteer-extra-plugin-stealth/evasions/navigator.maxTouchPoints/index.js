'use strict'

const { PuppeteerExtraPlugin } = require('puppeteer-extra-plugin')

const withUtils = require('../_utils/withUtils')

/**
 * Set `navigator.maxTouchPoints` to a value consistent with the platform.
 *
 * Desktop Chrome should return 0 (no touch), mobile should return > 0.
 * Detection services cross-reference this with the UA string's platform.
 *
 * @param {Object} [opts] - Options
 * @param {number} [opts.maxTouchPoints] - The value to use (default: `0` for desktop)
 */
class Plugin extends PuppeteerExtraPlugin {
  constructor(opts = {}) {
    super(opts)
  }

  get name() {
    return 'stealth/evasions/navigator.maxTouchPoints'
  }

  get defaults() {
    return {
      maxTouchPoints: 0
    }
  }

  async onPageCreated(page) {
    await withUtils(page).evaluateOnNewDocument(
      (utils, { opts }) => {
        utils.replaceGetterWithProxy(
          Object.getPrototypeOf(navigator),
          'maxTouchPoints',
          utils.makeHandler().getterValue(opts.maxTouchPoints)
        )
      },
      {
        opts: this.opts
      }
    )
  }
}

module.exports = function (pluginConfig) {
  return new Plugin(pluginConfig)
}
