'use strict'

const { PuppeteerExtraPlugin } = require('puppeteer-extra-plugin')

const withUtils = require('../_utils/withUtils')

/**
 * Set `history.length` to a realistic value.
 *
 * Fresh automation pages always have `history.length === 1`. While this is
 * also true for genuine direct navigation, detection services flag it when
 * combined with other signals. A slightly higher value is more common for
 * real browsing sessions.
 *
 * @param {Object} [opts] - Options
 * @param {number} [opts.length] - The history length to report (default: 2)
 */
class Plugin extends PuppeteerExtraPlugin {
  constructor(opts = {}) {
    super(opts)
  }

  get name() {
    return 'stealth/evasions/history.length'
  }

  get defaults() {
    return {
      length: 2
    }
  }

  async onPageCreated(page) {
    await withUtils(page).evaluateOnNewDocument(
      (utils, { opts }) => {
        utils.replaceGetterWithProxy(
          History.prototype,
          'length',
          utils.makeHandler().getterValue(opts.length)
        )
      },
      { opts: this.opts }
    )
  }
}

module.exports = function (pluginConfig) {
  return new Plugin(pluginConfig)
}
