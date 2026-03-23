'use strict'

const { PuppeteerExtraPlugin } = require('puppeteer-extra-plugin')

const withUtils = require('../_utils/withUtils')

/**
 * Set `navigator.deviceMemory` to a common value.
 *
 * In headless environments this can return 0 or inconsistent values.
 * Real browsers typically return 2, 4, or 8.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Navigator/deviceMemory
 *
 * @param {Object} [opts] - Options
 * @param {number} [opts.deviceMemory] - The value to use (default: `8`)
 */
class Plugin extends PuppeteerExtraPlugin {
  constructor(opts = {}) {
    super(opts)
  }

  get name() {
    return 'stealth/evasions/navigator.deviceMemory'
  }

  get defaults() {
    return {
      deviceMemory: 8
    }
  }

  async onPageCreated(page) {
    await withUtils(page).evaluateOnNewDocument(
      (utils, { opts }) => {
        utils.replaceGetterWithProxy(
          Object.getPrototypeOf(navigator),
          'deviceMemory',
          utils.makeHandler().getterValue(opts.deviceMemory)
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
