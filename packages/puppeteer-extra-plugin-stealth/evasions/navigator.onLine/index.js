'use strict'

const { PuppeteerExtraPlugin } = require('puppeteer-extra-plugin')

const withUtils = require('../_utils/withUtils')

/**
 * Ensure `navigator.onLine` returns true.
 *
 * In headless Chrome, `navigator.onLine` can return `false` in some
 * configurations. Real headful Chrome with a network connection always
 * returns `true`. Detection services check this as a quick signal.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine
 */
class Plugin extends PuppeteerExtraPlugin {
  constructor(opts = {}) {
    super(opts)
  }

  get name() {
    return 'stealth/evasions/navigator.onLine'
  }

  async onPageCreated(page) {
    await withUtils(page).evaluateOnNewDocument(utils => {
      utils.replaceGetterWithProxy(
        Object.getPrototypeOf(navigator),
        'onLine',
        utils.makeHandler().getterValue(true)
      )
    })
  }
}

module.exports = function (pluginConfig) {
  return new Plugin(pluginConfig)
}
